/**
 * S.T.E.P. — Confirm
 *
 * HTTP POST /confirm  →  sends SendTaskSuccess to resume a paused execution.
 *
 * This is the external signal that unblocks the waitForTaskToken state.
 * In production this is called by your Slack bot, mobile app, email link, etc.
 *
 * Request body:
 *   {
 *     "taskToken": "<the token from the execution context>",
 *     "status": "success" | "failure"   (optional, defaults to "success")
 *   }
 */

import { SFNClient, SendTaskSuccessCommand, SendTaskFailureCommand } from "@aws-sdk/client-sfn";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const sfnClient = new SFNClient({});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (!event.body) {
    return { statusCode: 400, body: JSON.stringify({ error: "Request body required" }) };
  }

  const { taskToken, status = "success" } = JSON.parse(event.body);

  if (!taskToken) {
    return { statusCode: 400, body: JSON.stringify({ error: "taskToken is required" }) };
  }

  console.log(`📡 Received confirmation signal: status=${status}`);

  if (status === "failure") {
    await sfnClient.send(new SendTaskFailureCommand({
      taskToken,
      error: "HumanRefused",
      cause: "Human explicitly declined to confirm upright status.",
    }));
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Execution marked as failed. You are definitely late." }),
    };
  }

  await sfnClient.send(new SendTaskSuccessCommand({
    taskToken,
    output: JSON.stringify({
      confirmed: true,
      confirmedAt: new Date().toISOString(),
      message: "Human confirmed vertical. Execution resuming.",
    }),
  }));

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Confirmed! Execution resuming. You made it. ☕",
    }),
  };
};
