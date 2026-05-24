/**
 * S.T.E.P. — WakeUpVerifier
 *
 * This Lambda is invoked by the Callback (waitForTaskToken) state.
 * It receives the task token from Step Functions, stores it (here: just logs it),
 * and returns immediately. The state machine is now PAUSED.
 *
 * The workflow won't resume until something calls:
 *   sfn.SendTaskSuccess({ taskToken, output: JSON.stringify({ confirmed: true }) })
 *
 * In the demo, the /confirm API endpoint does exactly that.
 * In production this might be a Slack bot, an email link, or a mobile push notification.
 */

import { SFNClient, SendTaskSuccessCommand, SendTaskFailureCommand } from "@aws-sdk/client-sfn";

export interface WakeUpVerifierInput {
  taskToken: string;
  context: {
    snoozeResult: { snoozeMinutes: number; snoozeReason: string };
    assessments: Array<unknown>;
  };
}

const sfnClient = new SFNClient({});

export const handler = async (event: WakeUpVerifierInput): Promise<void> => {
  const { taskToken, context } = event;

  console.log("📞 AWAIT CONFIRMATION — task token issued, execution paused");
  console.log(`   Snooze was: ${context.snoozeResult.snoozeMinutes} minutes`);
  console.log(`   Token (first 40 chars): ${taskToken.substring(0, 40)}...`);

  /**
   * In a real implementation, you'd:
   *   1. Store the taskToken somewhere retrievable (DynamoDB, SSM, etc.)
   *   2. Send a notification to the human (Slack, SMS, push notification)
   *   3. Include a link/action that POSTs the token to the /confirm endpoint
   *
   * For the demo, we auto-confirm after a short delay to show the pattern.
   * Set AUTO_CONFIRM=false in the environment to require manual confirmation.
   */
  if (process.env.AUTO_CONFIRM === "true") {
    // Demo shortcut: auto-confirm after 5 seconds so the audience can see
    // the execution resume without having to POST to the /confirm endpoint
    await new Promise(res => setTimeout(res, 5000));
    await sfnClient.send(new SendTaskSuccessCommand({
      taskToken,
      output: JSON.stringify({ confirmed: true, method: "auto-confirm (demo)", timestamp: new Date().toISOString() }),
    }));
    console.log("✅ Auto-confirmed for demo purposes");
  }
  // Otherwise: returns immediately, execution stays paused.
  // The /confirm endpoint must be called with the taskToken to resume.
};
