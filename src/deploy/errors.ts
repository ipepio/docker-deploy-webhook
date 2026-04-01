export class DeployError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeployError';
  }
}

export class TimeoutError extends DeployError {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class PullError extends DeployError {
  constructor(message: string) {
    super(message);
    this.name = 'PullError';
  }
}

export class UpError extends DeployError {
  constructor(message: string) {
    super(message);
    this.name = 'UpError';
  }
}

export class HealthcheckError extends DeployError {
  constructor(message: string) {
    super(message);
    this.name = 'HealthcheckError';
  }
}
