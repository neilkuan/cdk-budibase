import {
  aws_ec2 as ec2, aws_ecs as ecs, aws_efs as efs, aws_logs as logs, aws_iam as iam,
  aws_elasticloadbalancingv2 as elbv2, CfnOutput,
  RemovalPolicy, Duration, Tags,
} from 'aws-cdk-lib';
import { SubnetType } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface IBudiBaseBaseResourceProps {
  readonly vpc?: ec2.IVpc;
}
export class BudiBaseBaseResource extends Construct {
  constructor(scope: Construct, id: string, props?: IBudiBaseBaseResourceProps) {
    super(scope, id);

    const vpc = new ec2.Vpc(this, 'BudiBaseVpc', {
      natGateways: 1,
    }) ?? props?.vpc;

    const budiBaseSG = new ec2.SecurityGroup(this, 'BudiBaseSG', {
      securityGroupName: 'BudiBaseFargateService',
      vpc,
    });
    Tags.of(budiBaseSG).add(
      'Name',
      'BudiBaseFargateService',
    );

    const budiBaselbSG = new ec2.SecurityGroup(this, 'budiBaselbSG', {
      securityGroupName: 'BudiBaseLoadBalancer',
      vpc,
    });
    Tags.of(budiBaselbSG).add(
      'Name',
      'BudiBaseLoadBalancer',
    );

    /**
     * EFS
     */
    const budiBaseFileSystem = new efs.FileSystem(this, 'BudiBaseFileSystem', {
      fileSystemName: 'BudiBaseFileSystem',
      vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
      enableAutomaticBackups: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const accessPoint = new efs.AccessPoint(this, 'BudiBaseAccessPoint', {
      fileSystem: budiBaseFileSystem,
      path: '/data',
      createAcl: {
        ownerGid: '1001',
        ownerUid: '1001',
        permissions: '0755',
      },
      posixUser: {
        uid: '1001',
        gid: '1001',
      },
    });
    /**
     * ECS Cluster
     */
    const cluster = new ecs.Cluster(this, 'BudiBaseCluster', {
      clusterName: 'BudiBaseCluster',
      vpc,
    });

    /**
     * ECS Service
     */
    const fargateTaskDefinition = new ecs.FargateTaskDefinition(this, 'BudiBaseTaskDefinition', {
      family: 'budibase-family',
      memoryLimitMiB: 8192,
      cpu: 4096,
    });

    const budiBaseContainer = fargateTaskDefinition.addContainer(
      'BudiBaseContainer',
      {
        containerName: 'budibase',
        image: ecs.ContainerImage.fromRegistry('budibase/budibase:v2.2.23'),
        portMappings: [
          {
            containerPort: 80,
            hostPort: 80,
          },
          {
            containerPort: 443,
            hostPort: 443,
          },
          {
            containerPort: 2222,
            hostPort: 2222,
          },
          {
            containerPort: 4369,
            hostPort: 4369,
          },
          {
            containerPort: 5984,
            hostPort: 5984,
          },
          {
            containerPort: 9100,
            hostPort: 9100,
          },
        ],
        logging: new ecs.AwsLogDriver({
          streamPrefix: 'budibase',
          logGroup: new logs.LogGroup(this, 'BudibaseContainerLogGroup', {
            logGroupName: 'budibase',
            removalPolicy: RemovalPolicy.DESTROY,
          }),
        }),
        // entryPoint: [''],
        // command: ['tail', '-f', '/dev/null'],
        healthCheck: {
          startPeriod: Duration.seconds(75),
          command: ['CMD-SHELL', '/healthcheck.sh'],
        },
      },
    );

    const volume: ecs.Volume = {
      name: 'budibase-data-volume',
      efsVolumeConfiguration: {
        fileSystemId: budiBaseFileSystem.fileSystemId,
        /**
         * When using an EFS access point, the root directory must either be set to "/" or be omitted.
         */
        // rootDirectory: '/',
        authorizationConfig: {
          accessPointId: accessPoint.accessPointId,
          // iam: 'ENABLED',
        },
        transitEncryption: 'ENABLED',
      },
    };

    budiBaseContainer.addMountPoints({
      sourceVolume: 'budibase-data-volume',
      containerPath: '/data',
      readOnly: false,
    });

    fargateTaskDefinition.addVolume(volume);
    const budiBaseService = new ecs.FargateService(
      this,
      'BudiBaseService',
      {
        serviceName: 'budibase',
        taskDefinition: fargateTaskDefinition,
        cluster,
        vpcSubnets: {
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
        enableExecuteCommand: true,
        platformVersion: ecs.FargatePlatformVersion.VERSION1_4,
        securityGroups: [budiBaseSG],
      },
    );

    fargateTaskDefinition.addToExecutionRolePolicy(new iam.PolicyStatement({
      actions: [
        'elasticfilesystem:ClientMount',
        'elasticfilesystem:ClientWrite',
        'elasticfilesystem:ClientRootAccess',
        'elasticfilesystem:DescribeMountTargets',
      ],
      resources: [
        accessPoint.fileSystem.fileSystemArn,
      ],
    }));

    budiBaseService.node.addDependency(accessPoint.fileSystem.mountTargetsAvailable);

    budiBaseFileSystem.connections.allowFrom(budiBaseService, ec2.Port.tcp(2049));
    /**
     * Load Balancer
     */
    const lb = new elbv2.ApplicationLoadBalancer(
      this,
      'budibase-lb',
      {
        loadBalancerName: 'BudibaseLoadBalancer',
        vpc,
        vpcSubnets: {
          subnetType: SubnetType.PUBLIC,
        },
        internetFacing: true,
        securityGroup: budiBaselbSG,
      },
    );

    /**
     * 定義 80 port listener.
     */
    // lb.addListener('Listener80', {
    //   port: 80,
    //   open: false,
    //   defaultAction: elbv2.ListenerAction.redirect({
    //     protocol: 'HTTPS',
    //     host: '#{host}',
    //     path: '/#{path}',
    //     query: '/#{query}',
    //     port: '443',
    //   }),
    // });

    // const listener443 = lb.addListener('Listener443', {
    //   port: 443,
    //   open: false,
    //   certificates: [certificatemanager.Certificate.fromCertificateArn(this, 'ca', '')],
    //   defaultAction: elbv2.ListenerAction.fixedResponse(404),
    // });

    const listener80 = lb.addListener('Listener80', {
      port: 80,
      open: true,
    });

    listener80.addTargets('listener80', {
      port: 80,
      targets: [budiBaseService],
      healthCheck: {
        path: '/',
        healthyHttpCodes: '200-299,301-302',
        interval: Duration.seconds(30),
      },
    });

    new CfnOutput(this, 'LoadBalancerDNS', {
      value: lb.loadBalancerDnsName,
    });

    new CfnOutput(this, 'BudiBaselbSGId', {
      value: budiBaselbSG.securityGroupId,
    });
  }
}