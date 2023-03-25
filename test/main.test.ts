import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
  BudiBaseBaseResource,
} from '../src/index';

test('Snapshot', () => {
  const app = new App();
  const stack = new Stack(app, 'test');
  new BudiBaseBaseResource(stack, 'test');

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});