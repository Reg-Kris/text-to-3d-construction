/**
 * MSW Server Configuration for Testing
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { setupServer } from 'msw/node';
import { meshyHandlers } from './handlers/meshy';
import { airtableHandlers } from './handlers/airtable';
import { monitoringHandlers } from './handlers/monitoring';

export const server = setupServer(
  ...meshyHandlers,
  ...airtableHandlers,
  ...monitoringHandlers
);