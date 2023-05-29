#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { vpcStack } from '../lib/stack/vpc-stack';
import { PitchStack } from '../lib/stack/pitch-stack';
const env = {
  region: "eu-north-1",
  account: "172165167974",
};

const app = new cdk.App();
const vpc = new vpcStack(app, "VPCStack", {
  env: env,
});
new PitchStack(app, "PitchStack", {
  internetFacing: true,
  env: env,
  customEcsProps: {
    env: env,
    vpc: vpc.vpc,
    containerConfig: {
      cpu: 256,
      memory: 512,
      portMappings: [
        { containerPort: 80, },
      ],
      containerImageLink: "tutum/hello-world",
    },
    serviceConfig: {
      maxContainerNumber: 10,
      cpuUtilizationToScale: 80,
      memoryUtilizationToScale: 80,
      hasPublicIp: true,
    },
  }
});