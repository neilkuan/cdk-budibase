import { App, Stack } from 'aws-cdk-lib';
import { BudiBaseBaseResource } from './budibase-base-resource';


const app = new App();
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const stack = new Stack(app, 'integTestStack', { env });
new BudiBaseBaseResource(stack, 'BudiBaseBaseResource');

app.synth();