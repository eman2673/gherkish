import { feature } from './feature';
import { scenario } from './scenario';
import { Given, When, Then } from './step-types';

(globalThis as any).Feature = feature;
(globalThis as any).Scenario = scenario;
(globalThis as any).Given = Given;
(globalThis as any).When = When;
(globalThis as any).Then = Then;
