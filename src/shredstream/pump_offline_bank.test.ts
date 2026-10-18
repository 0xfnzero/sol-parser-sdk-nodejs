import {expect,it} from 'vitest';
import {runBank} from '../../examples/pump_offline_bank.js';
it('executes native signed Pump routes twice and validates parsing and rollback',()=>expect(runBank()).toBe(20),120000);
