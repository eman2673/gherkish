import { expect } from 'vitest';
import { registerStepUtils } from '../step-types';

registerStepUtils({
  then: {
    expect,
  },
});
