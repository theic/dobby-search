import { LogLevel } from '@nestjs/common';
import { registerAs } from '@nestjs/config';
import { ConfigType } from '@shared/enum';

export interface ServerConfig {
  port: number;
  logLevels: LogLevel[];
  nodeEnv: string;
}

export const ServerConfig = registerAs(ConfigType.SERVER, () => {
  const { PORT, LOG_LEVELS, NODE_ENV } = process.env;

  if (!PORT) {
    throw new Error('Server port must be declared explicitly.');
  }

  if (!LOG_LEVELS) {
    throw new Error('Log levels must be declared explicitly.');
  }

  if (!NODE_ENV) {
    throw new Error('Node environment must be declared explicitly.');
  }

  return {
    port: parseInt(PORT, 10),
    logLevels: (process.env.LOG_LEVELS?.split(',') as LogLevel[]) || ['debug'],
    nodeEnv: NODE_ENV,
  };
});
