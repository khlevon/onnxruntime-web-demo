export class SignalPromise<T, TReject = void> {
  public signal: Promise<T>;

  private resolve?: (value: T) => void;
  private reject?: (reason: TReject) => void;
  private status: 'pending' | 'resolved' | 'rejected';
  private value?: T;
  private reason?: TReject;

  constructor() {
    this.status = 'pending';

    this.signal = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;

      if (this.status === 'resolved') {
        this.resolve(this.value as T);
      } else if (this.status === 'rejected') {
        this.reject(this.reason as TReject);
      }
    });
  }

  public isPending(): boolean {
    return this.status === 'pending';
  }

  public resolveSignal(value: T): void {
    if (this.status !== 'pending') {
      return;
    }

    this.value = value;
    this.status = 'resolved';

    if (this.resolve) {
      this.resolve(value);
    }
  }

  public rejectSignal(reason: TReject): void {
    if (this.status !== 'pending') {
      return;
    }

    this.reason = reason;
    this.status = 'rejected';

    if (this.reject) {
      this.reject(reason);
    }
  }
}
