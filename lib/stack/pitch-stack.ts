import { Stack, StackProps } from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { CustomEcsConstructProps, customEcsConstruct } from "../construct/customEcs";
import { LoadBalancerWithAlarms } from "../construct/loadBalancerWithAlarms";

interface PitchStackProps extends StackProps {
    internetFacing: boolean;
    customEcsProps: CustomEcsConstructProps;
}

export class PitchStack extends Stack {
    constructor(scope: Construct, id: string, props: PitchStackProps) {
        super(scope, id, props);
        const alb = new LoadBalancerWithAlarms(this, `${id}-LoadBalancer`, {
            vpc: props.customEcsProps.vpc,
            minPercentSuccessfulRequests: 80,
            maxPercentServerErrorRequests: 5,
            internetFacing: props.internetFacing,
        });

        const customEcs = new customEcsConstruct(this, `${id}-CustomEcs`, props.customEcsProps);

        customEcs.connectLoadBalancer(alb);
    }
}