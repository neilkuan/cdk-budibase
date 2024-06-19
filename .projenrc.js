const { awscdk, github } = require('projen');
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
      labels: ['auto-approve'],
      projenCredentials: github.GithubCredentials.fromPersonalAccessToken({
        secret: 'AUTO_MACHINE_TOKEN',
      }),
    },
  },

  autoApproveOptions: {
    secret: 'PROJEN_GITHUB_TOKEN',
    allowedUsernames: ['auto-machine', 'neilkuan'],
  },
  publishToPypi: {
    distName: 'cdk-budibase',
    module: 'cdk_budibase',
  },
  workflowNodeVersion: '^20',
  typescriptVersion: '^4.9',
});
const common_exclude = ['cdk.out', 'cdk.context.json', 'yarn-error.log', 'coverage'];
project.gitignore.exclude(...common_exclude);

project.npmignore.exclude(...common_exclude, 'image');
project.synth();