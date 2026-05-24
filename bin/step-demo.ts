#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { StepStack } from "../lib/step-stack";

const app = new cdk.App();

new StepStack(app, "StepDemoStack", {
  description: "S.T.E.P. — Snooze Time Extension Protocol (ATL Cloud Conference demo)",
  tags: {
    Project: "step-demo",
    Talk:    "ATL Cloud Conference 2026",
    Author:  "Basil Udoudoh",
  },
});
