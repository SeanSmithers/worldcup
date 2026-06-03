// FIFA 3-letter code → flag-icons ISO 3166-1 alpha-2 code (lowercase).
// flag-icons uses GB subdivision codes for England/Scotland/Wales/Northern Ireland.
const FIFA_TO_ISO: Record<string, string> = {
  ALG: "dz", ARG: "ar", AUS: "au", AUT: "at",
  BEL: "be", BIH: "ba", BRA: "br",
  CAN: "ca", CIV: "ci", COD: "cd", COL: "co", CPV: "cv", CRO: "hr", CUW: "cw", CZE: "cz",
  ECU: "ec", EGY: "eg", ENG: "gb-eng", ESP: "es",
  FRA: "fr",
  GER: "de", GHA: "gh",
  HAI: "ht",
  IRN: "ir", IRQ: "iq",
  JOR: "jo", JPN: "jp",
  KOR: "kr", KSA: "sa",
  MAR: "ma", MEX: "mx",
  NED: "nl", NOR: "no", NZL: "nz",
  PAN: "pa", PAR: "py", POR: "pt",
  QAT: "qa",
  RSA: "za",
  SCO: "gb-sct", SEN: "sn", SUI: "ch", SWE: "se",
  TUN: "tn", TUR: "tr",
  URU: "uy", USA: "us", UZB: "uz",
};

export function fifaToIso(code: string): string | null {
  return FIFA_TO_ISO[code] ?? null;
}
