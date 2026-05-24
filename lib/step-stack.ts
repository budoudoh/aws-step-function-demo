import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as logs from "aws-cdk-lib/aws-logs";
import * as iam from "aws-cdk-lib/aws-iam";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";

export class StepStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── Lambda functions ──────────────────────────────────────────────────

    const lambdaDefaults: Partial<NodejsFunction["node"]["defaultChild"]> & {
      runtime: lambda.Runtime;
      timeout: cdk.Duration;
      memorySize: number;
    } = {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
    };

    const alarmHandler = new NodejsFunction(this, "AlarmHandler", {
      entry: path.join(__dirname, "../lambdas/alarm-handler.ts"),
      handler: "handler",
      ...lambdaDefaults,
      description: "S.T.E.P. — Registers the alarm firing and builds initial execution context",
    });

    const calendarCheck = new NodejsFunction(this, "CalendarCheck", {
      entry: path.join(__dirname, "../lambdas/calendar-check.ts"),
      handler: "handler",
      ...lambdaDefaults,
      description: "S.T.E.P. — Checks first meeting of the day",
    });

    const weatherCheck = new NodejsFunction(this, "WeatherCheck", {
      entry: path.join(__dirname, "../lambdas/weather-check.ts"),
      handler: "handler",
      ...lambdaDefaults,
      description: "S.T.E.P. — Rates outfit complexity based on weather conditions",
    });

    const weekendCheck = new NodejsFunction(this, "WeekendCheck", {
      entry: path.join(__dirname, "../lambdas/weekend-check.ts"),
      handler: "handler",
      ...lambdaDefaults,
      description: "S.T.E.P. — Determines whether today is a weekend",
    });

    const excuseScorer = new NodejsFunction(this, "ExcuseScorer", {
      entry: path.join(__dirname, "../lambdas/excuse-scorer.ts"),
      handler: "handler",
      ...lambdaDefaults,
      description: "S.T.E.P. — Scores the viability of a single excuse",
    });

    const snoozeCalculator = new NodejsFunction(this, "SnoozeCalculator", {
      entry: path.join(__dirname, "../lambdas/snooze-calculator.ts"),
      handler: "handler",
      ...lambdaDefaults,
      description: "S.T.E.P. — Calculates the maximum defensible snooze duration",
    });

    const wakeUpVerifier = new NodejsFunction(this, "WakeUpVerifier", {
      entry: path.join(__dirname, "../lambdas/wake-up-verifier.ts"),
      handler: "handler",
      ...lambdaDefaults,
      description: "S.T.E.P. — Sends the task token and waits for human confirmation",
    });

    // ── State Machine states ──────────────────────────────────────────────

    // 1. ALARM FIRES — Task State
    const alarmFires = new tasks.LambdaInvoke(this, "AlarmFires", {
      lambdaFunction: alarmHandler,
      comment: "Register the alarm event and build initial execution context",
      resultSelector: { "body.$": "$.Payload" },
      resultPath: "$.alarmResult",
    });

    // 2. PARALLEL ASSESSMENT — Parallel State
    //    Three branches run simultaneously
    const checkCalendar = new tasks.LambdaInvoke(this, "CheckCalendar", {
      lambdaFunction: calendarCheck,
      resultSelector: { "firstMeeting.$": "$.Payload.firstMeeting", "bufferMinutes.$": "$.Payload.bufferMinutes" },
    });

    const checkWeather = new tasks.LambdaInvoke(this, "CheckWeather", {
      lambdaFunction: weatherCheck,
      resultSelector: { "outfitComplexityScore.$": "$.Payload.outfitComplexityScore", "condition.$": "$.Payload.condition" },
    });

    const checkWeekend = new tasks.LambdaInvoke(this, "CheckWeekend", {
      lambdaFunction: weekendCheck,
      resultSelector: { "isWeekend.$": "$.Payload.isWeekend", "dayOfWeek.$": "$.Payload.dayOfWeek" },
    });

    const parallelAssessment = new sfn.Parallel(this, "ParallelAssessment", {
      comment: "Run calendar, weather, and weekend checks simultaneously",
      resultPath: "$.assessments",
    });
    parallelAssessment.branch(checkCalendar);
    parallelAssessment.branch(checkWeather);
    parallelAssessment.branch(checkWeekend);

    // 3. IS IT WEEKEND? — Choice State
    const sleepIn = new sfn.Succeed(this, "SleepIn", {
      comment: "It's the weekend. You earned this. Go back to sleep.",
    });

    const isItWeekend = new sfn.Choice(this, "IsItWeekend", {
      comment: "Branch based on whether today is a weekend",
    });

    // 4. MAP OVER EXCUSES — Map State
    const scoreExcuse = new tasks.LambdaInvoke(this, "ScoreExcuse", {
      lambdaFunction: excuseScorer,
      resultSelector: { "excuse.$": "$.Payload.excuse", "score.$": "$.Payload.score", "viable.$": "$.Payload.viable" },
    });

    const mapExcuses = new sfn.Map(this, "MapExcuses", {
      comment: "Evaluate each excuse in the inventory for viability",
      itemsPath: "$.excuses",
      resultPath: "$.scoredExcuses",
      maxConcurrency: 5,
    });
    mapExcuses.itemProcessor(scoreExcuse);

    // 5. CALCULATE SNOOZE WINDOW — Task State (with Retry)
    const calculateSnoozeWindow = new tasks.LambdaInvoke(this, "CalculateSnoozeWindow", {
      lambdaFunction: snoozeCalculator,
      comment: "Determine the maximum defensible snooze duration based on assessed context",
      resultSelector: { "snoozeSeconds.$": "$.Payload.snoozeSeconds", "snoozeReason.$": "$.Payload.snoozeReason" },
      resultPath: "$.snoozeResult",
    });
    // Add retry with exponential backoff
    calculateSnoozeWindow.addRetry({
      errors: ["Lambda.ServiceException", "Lambda.AWSLambdaException", "Lambda.SdkClientException"],
      interval: cdk.Duration.seconds(2),
      maxAttempts: 3,
      backoffRate: 2,
    });

    // 6. EXECUTE SNOOZE — Wait State
    //    Pauses for the calculated snooze duration
    const executeSnooze = new sfn.Wait(this, "ExecuteSnooze", {
      comment: "The snooze itself. Execution paused for the calculated duration.",
      time: sfn.WaitTime.secondsPath("$.snoozeResult.snoozeSeconds"),
    });

    // 7. WAKE UP CHECK — Task with Retry (retry simulates hitting snooze again)
    const wakeUpCheck = new tasks.LambdaInvoke(this, "WakeUpCheck", {
      lambdaFunction: alarmHandler, // reuse alarm handler for demo simplicity
      comment: "Check if human is showing signs of consciousness",
      payload: sfn.TaskInput.fromObject({ action: "wakeUpCheck", "context.$": "$" }),
      resultSelector: { "awake.$": "$.Payload.awake" },
      resultPath: "$.wakeUpResult",
    });
    // Retry simulates hitting snooze multiple times — backoff gets exponentially worse
    wakeUpCheck.addRetry({
      errors: ["HumanUnresponsive"],
      interval: cdk.Duration.seconds(3),  // In demo: seconds. In prod: minutes.
      maxAttempts: 3,
      backoffRate: 2,
    });
    wakeUpCheck.addCatch(
      new sfn.Fail(this, "YouAreLate", {
        error: "HumanUnresponsive",
        cause: "The human failed to acknowledge consciousness after 3 attempts. You are late.",
      }),
      { errors: ["States.ALL"] }
    );

    // 8. AWAIT CONFIRMATION — waitForTaskToken Callback
    //    Workflow pauses completely until external system calls SendTaskSuccess
    const awaitConfirmation = new tasks.LambdaInvoke(this, "AwaitConfirmation", {
      lambdaFunction: wakeUpVerifier,
      comment: "Send task token externally. Wait for human to confirm they are vertical.",
      integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
      payload: sfn.TaskInput.fromObject({
        taskToken: sfn.JsonPath.taskToken,
        "context.$": "$",
      }),
      heartbeat: cdk.Duration.minutes(5),
      resultPath: "$.confirmationResult",
    });
    awaitConfirmation.addCatch(
      new sfn.Fail(this, "ConfirmationTimeout", {
        error: "ConfirmationTimeout",
        cause: "Human did not confirm upright status within the allotted window. Truly a lost cause.",
      }),
      { errors: ["States.HeartbeatTimeout", "States.Timeout"] }
    );

    const youMadeIt = new sfn.Succeed(this, "YouMadeIt", {
      comment: "Against all odds, the human is awake and mobile.",
    });

    // ── Wire the state machine ────────────────────────────────────────────

    const definition = alarmFires
      .next(parallelAssessment)
      .next(
        isItWeekend
          .when(
            sfn.Condition.booleanEquals("$.assessments[2].isWeekend", true),
            sleepIn
          )
          .otherwise(mapExcuses)
      );

    mapExcuses
      .next(calculateSnoozeWindow)
      .next(executeSnooze)
      .next(wakeUpCheck)
      .next(awaitConfirmation)
      .next(youMadeIt);

    // ── State Machine ─────────────────────────────────────────────────────

    const logGroup = new logs.LogGroup(this, "StepLogGroup", {
      logGroupName: "/aws/states/snooze-time-extension-protocol",
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const stateMachine = new sfn.StateMachine(this, "SnoozeMachine", {
      stateMachineName: "snooze-time-extension-protocol",
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      timeout: cdk.Duration.hours(2),
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL,
        includeExecutionData: true,
      },
      tracingEnabled: true, // X-Ray tracing
    });

    // ── API Gateway — trigger endpoint for the demo ───────────────────────

    const triggerFn = new NodejsFunction(this, "TriggerFn", {
      entry: path.join(__dirname, "../lambdas/trigger.ts"),
      handler: "handler",
      ...lambdaDefaults,
      description: "S.T.E.P. — HTTP trigger for the state machine (demo)",
      environment: {
        STATE_MACHINE_ARN: stateMachine.stateMachineArn,
      },
    });
    stateMachine.grantStartExecution(triggerFn);

    // Confirm endpoint — called externally to unblock the waitForTaskToken
    const confirmFn = new NodejsFunction(this, "ConfirmFn", {
      entry: path.join(__dirname, "../lambdas/confirm.ts"),
      handler: "handler",
      ...lambdaDefaults,
      description: "S.T.E.P. — Called externally to confirm human is awake (unblocks waitForTaskToken)",
    });
    confirmFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ["states:SendTaskSuccess", "states:SendTaskFailure"],
      resources: ["*"],
    }));

    const api = new apigateway.RestApi(this, "StepApi", {
      restApiName: "snooze-time-extension-protocol",
      description: "S.T.E.P. demo API",
      deployOptions: { stageName: "demo" },
    });

    api.root.addResource("start").addMethod("POST", new apigateway.LambdaIntegration(triggerFn));
    api.root.addResource("confirm").addMethod("POST", new apigateway.LambdaIntegration(confirmFn));

    // ── Outputs ───────────────────────────────────────────────────────────

    new cdk.CfnOutput(this, "StateMachineArn", {
      value: stateMachine.stateMachineArn,
      description: "ARN of the S.T.E.P. state machine",
    });
    new cdk.CfnOutput(this, "StartEndpoint", {
      value: `${api.url}start`,
      description: "POST here to kick off a S.T.E.P. execution",
    });
    new cdk.CfnOutput(this, "ConfirmEndpoint", {
      value: `${api.url}confirm`,
      description: "POST { taskToken, status } here to confirm you're awake",
    });
  }
}
