export class Logger {
  private prefix = "hotzenplotz: ";
  private debug: boolean;

  constructor(debug: boolean) {
    this.debug = debug;
  }

  public log(text: any) {
    if(!this.debug) {
      return;
    }

    console.log(this.prefix + text);
  }
}
