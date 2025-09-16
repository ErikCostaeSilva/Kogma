declare module "bcryptjs" {
  export function genSaltSync(rounds?: number): string;
  export function hashSync(s: string, salt?: string): string;
  export function compare(s: string, hash: string): Promise<boolean>;
  export function compareSync(s: string, hash: string): boolean;
  export function hash(s: string, rounds?: number): Promise<string>;
  const _default: {
    genSaltSync: typeof genSaltSync;
    hashSync: typeof hashSync;
    compare: typeof compare;
    compareSync: typeof compareSync;
    hash: typeof hash;
  };
  export default _default;
}
