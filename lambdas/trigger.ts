/**
 * S.T.E.P. — Trigger
 *
 * HTTP POST /start  →  starts a new S.T.E.P. state machine execution.
 *
 * Example request body (all optional — defaults are sensible):
 *   { "name": "monday-morning-attempt-1" }
 *
 * Returns the execution ARN so you can watch it in the console.
 */

import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const sfnClient = new SFNClient({});
const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const body = event.body ? JSON.parse(event.body) : {};
  const executionName = body.name ?? `step-execution-${Date.now()}`;

  console.log(`▶️ Starting S.T.E.P. execution: ${executionName}`);

  const result = await sfnClient.send(new StartExecutionCommand({
    stateMachineArn: STATE_MACHINE_ARN,
    name: executionName,
    input: JSON.stringify({ startedAt: new Date().toISOString() }),
  }));

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "S.T.E.P. execution started. Buckle up.",
      executionArn: result.executionArn,
      startDate: result.startDate,
    }),
  };
};
