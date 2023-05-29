import { ComparisonOperator, MathExpression } from "aws-cdk-lib/aws-cloudwatch";
import { ApplicationLoadBalancer, ApplicationLoadBalancerProps, HttpCodeTarget } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";
import { AlarmToSns } from "./alarmToSns";

interface LoadBalancerWithAlarmsProps extends ApplicationLoadBalancerProps {
    minPercentSuccessfulRequests: number;
    maxPercentServerErrorRequests: number;
}

export class LoadBalancerWithAlarms extends ApplicationLoadBalancer {
    constructor(scope: Construct, id: string, props: LoadBalancerWithAlarmsProps) {
        super(scope, id, props);
        
        this.setup5xxAlarm(id, props.maxPercentServerErrorRequests);
        this.setup2xxAlarm(id, props.minPercentSuccessfulRequests);
    }

    setup5xxAlarm(id: string, threshold: number) {
        const serverErrorPercentage = new MathExpression({
            expression: "m1/m2*100",
            usingMetrics: {
                m1: this.metrics.httpCodeTarget(HttpCodeTarget.TARGET_5XX_COUNT),
                m2: this.metrics.requestCount(),
            },
        });

        new AlarmToSns(this, `${id}-5xxError-percent`, {
            metric: serverErrorPercentage,
            threshold: threshold,
            evaluationPeriods: 1,
            comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
        });
    }

    setup2xxAlarm(id: string, threshold: number) {
        const successfulRequestPercentage = new MathExpression({
            expression: "m1/m2*100",
            usingMetrics: {
                m1: this.metrics.httpCodeTarget(HttpCodeTarget.TARGET_2XX_COUNT),
                m2: this.metrics.requestCount(),
            },
        });

        new AlarmToSns(this, `${id}-2xxSuccess-percent`, {
            metric: successfulRequestPercentage,
            threshold: threshold,
            evaluationPeriods: 1,
            comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
        });
    }
}