const { awscdk } = require('projen');
const PROJECT_DESCRIPTION = 'Use AWS CDK to create budibase server';
const project = new awscdk.AwsCdkConstructLibrary({
  cdkVersion: '2.63.0',
  description: PROJECT_DESCRIPTION,
  defaultReleaseBranch: 'main',
  repository: 'https://github.com/neilkuan/cdk-budibase.git',
  name: 'cdk-budibase',
  authorName: 'Neil Kuan',
  authorEmail: 'guan840912@gmail.com',
  keywords: ['aws', 'budibase', 'efs'],
  compat: true,
  stability: 'experimental',
  depsUpgradeOptions: {
    ignoreProjen: false,
    workflowOptions: {
      labels: ['auto-approve', 'auto-merge'],
    },
  },
  autoApproveOptions: {
    secret: 'GITHUB_TOKEN',
    allowedUsernames: ['neilkuan'],
  },
  publishToPypi: {
    distName: 'cdk-budibase',
    module: 'cdk_budibase',
  },
  workflowNodeVersion: '^14.17.0',
  typescriptVersion: '3.9.10',
});
const common_exclude = ['cdk.out', 'cdk.context.json', 'yarn-error.log', 'coverage'];
project.gitignore.exclude(...common_exclude);

project.npmignore.exclude(...common_exclude, 'image');
project.synth();