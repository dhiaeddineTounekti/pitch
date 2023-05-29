import { Alarm, ComparisonOperator, IMetric, Metric, TreatMissingData } from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import { PolicyStatement, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Topic } from "aws-cdk-lib/aws-sns";
import { Construct } from "constructs";

interface AlarmToSnsProps {
    metric: IMetric;
    threshold: number;
    evaluationPeriods: number;
    comparisonOperator: ComparisonOperator;
    treatMissingData?: TreatMissingData;
}

export class AlarmToSns extends Construct {
    constructor(scope: Construct, id: string, props: AlarmToSnsProps) {
        super(scope, id);
        const topic = new Topic(this, `${id}-Topic`);

        const alarm = new Alarm(this, `${id}-Alarm`, {
            ...props,
        });

        alarm.addAlarmAction(new SnsAction(topic));

        topic.addToResourcePolicy(new PolicyStatement({
            actions: ['SNS:Publish'],
            resources: [topic.topicArn],
            principals: [new ServicePrincipal('cloudwatch.amazonaws.com')],
            conditions: {
                ArnEquals: { 'aws:SourceArn': alarm.alarmArn },
            },
        }));
    }
}