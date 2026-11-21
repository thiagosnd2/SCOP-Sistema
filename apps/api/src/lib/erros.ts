export class ErroHttp extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
