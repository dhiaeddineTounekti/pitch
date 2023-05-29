import { StackProps } from 'aws-cdk-lib';
import { IMetric } from 'aws-cdk-lib/aws-cloudwatch';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { AwsLogDriver, Cluster, ContainerImage, FargateService, FargateTaskDefinition, PortMap, PortMapping } from 'aws-cdk-lib/aws-ecs';
import { AddApplicationTargetsProps, ApplicationLoadBalancer, ApplicationProtocol, ApplicationProtocolVersion, SslPolicy } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

interface ContainerConfig {
  cpu?: number;
  memory?: number;
  portMappings: PortMapping[],
  containerImageLink: string;
}

interface serviceConfig {
  maxContainerNumber: number;
  cpuUtilizationToScale: number;
  memoryUtilizationToScale: number;
  hasPublicIp: boolean;
}

export interface CustomEcsConstructProps extends StackProps {
  env: {
    region: string;
    account: string;
  };
  vpc: Vpc;
  containerConfig: ContainerConfig;
  serviceConfig: serviceConfig;
}

export class customEcsConstruct extends Construct {
  service: FargateService;
  metrics: IMetric[];
  private props: CustomEcsConstructProps;
  id: string;

  constructor(scope: Construct, id: string, props: CustomEcsConstructProps) {
    super(scope, id);
    this.id = id;
    this.props = props;

    const taskDefinition = this.defineTask(id, props);

    const cluster = new Cluster(this, `${id}-Cluster`, {
      vpc: props.vpc,
    });

    this.setupService(cluster, taskDefinition, props.serviceConfig);
  }

  public addPolicyToTask(policyArn: string) {
    this.service.taskDefinition.taskRole.addManagedPolicy({ managedPolicyArn: policyArn });
  }

  public connectLoadBalancer(loadBalancer: ApplicationLoadBalancer, targetProtocol?: ApplicationProtocol, protocolVersion?: ApplicationProtocolVersion) {
    this.props.containerConfig.portMappings.forEach((portMapping) => {

      const listener = loadBalancer.addListener('Listener', {
        port: this.props.containerConfig.portMappings[0].containerPort,
        open: true,
      });

      const targetProps: AddApplicationTargetsProps = {
        protocol: targetProtocol ?? ApplicationProtocol.HTTP,
        protocolVersion: protocolVersion,
      };

      const targetGroup = listener.addTargets('ECS', targetProps);
      
      targetGroup.addTarget(this.service);
    });
  }

  private setupService(cluster: Cluster, taskDefinition: FargateTaskDefinition, props: serviceConfig) {
    this.service = new FargateService(this, "MyFargateService", {
      cluster: cluster,
      taskDefinition: taskDefinition,
      assignPublicIp: props.hasPublicIp,
    });
    const scheduler = this.service.autoScaleTaskCount({ maxCapacity: props.maxContainerNumber });
    scheduler.scaleOnCpuUtilization('CpuScaling', { targetUtilizationPercent: props.cpuUtilizationToScale });
    scheduler.scaleOnMemoryUtilization('MemoryScaling', { targetUtilizationPercent: props.memoryUtilizationToScale });
  }

  private defineTask(id: string, props: CustomEcsConstructProps) {
    const taskDefinition = new FargateTaskDefinition(
      this,
      `${id}-Task-Definition`
    );

    const logger = new AwsLogDriver({
      streamPrefix: `${id}-Log`,
      logRetention: RetentionDays.ONE_WEEK,
    });

    taskDefinition.addContainer(`${id}-Container`, {
      image: ContainerImage.fromRegistry(props.containerConfig.containerImageLink),
      logging: logger,
      portMappings: props.containerConfig.portMappings,
    });
    return taskDefinition;
  }
}

