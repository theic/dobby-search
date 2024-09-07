import { registerAs } from '@nestjs/config';
import { ConfigType } from '@shared/enum';

export interface ServerConfig {
  port: number;
}

export const ServerConfig = registerAs(ConfigType.SERVER, () => {
  const { PORT } = process.env;

  if (!PORT) {
    throw new Error('Server port must be declared explicitly.');
  }

  return {
    port: parseInt(PORT, 10),
  };
});
