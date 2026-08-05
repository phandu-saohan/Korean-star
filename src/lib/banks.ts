export interface BankInfo {
  code: string;
  shortName: string;
  fullName: string;
  logo: string;
  logoUrl?: string;
}

export const VIETNAM_BANKS: BankInfo[] = [
  {
    code: "VCB",
    shortName: "Vietcombank",
    fullName: "Ngân hàng TMCP Ngoại Thương Việt Nam",
    logo: "https://img.vietqr.io/image/VCB-logo.png"
  },
  {
    code: "MB",
    shortName: "MB Bank",
    fullName: "Ngân hàng TMCP Quân Đội",
    logo: "https://img.vietqr.io/image/MB-logo.png"
  },
  {
    code: "TCB",
    shortName: "Techcombank",
    fullName: "Ngân hàng TMCP Kỹ Thương Việt Nam",
    logo: "https://img.vietqr.io/image/TCB-logo.png"
  },
  {
    code: "VPB",
    shortName: "VPBank",
    fullName: "Ngân hàng TMCP Việt Nam Thịnh Vượng",
    logo: "https://img.vietqr.io/image/VPB-logo.png"
  },
  {
    code: "ACB",
    shortName: "ACB",
    fullName: "Ngân hàng TMCP Á Châu",
    logo: "https://img.vietqr.io/image/ACB-logo.png"
  },
  {
    code: "BIDV",
    shortName: "BIDV",
    fullName: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam",
    logo: "https://img.vietqr.io/image/BIDV-logo.png"
  },
  {
    code: "VBA",
    shortName: "Agribank",
    fullName: "Ngân hàng Nông nghiệp và Phát triển Nông thôn VN",
    logo: "https://img.vietqr.io/image/VBA-logo.png"
  },
  {
    code: "TPB",
    shortName: "TPBank",
    fullName: "Ngân hàng TMCP Tiên Phong",
    logo: "https://img.vietqr.io/image/TPB-logo.png"
  },
  {
    code: "CTG",
    shortName: "VietinBank",
    fullName: "Ngân hàng TMCP Công Thương Việt Nam",
    logo: "https://img.vietqr.io/image/CTG-logo.png"
  },
  {
    code: "STB",
    shortName: "Sacombank",
    fullName: "Ngân hàng TMCP Sài Gòn Thương Tín",
    logo: "https://img.vietqr.io/image/STB-logo.png"
  },
  {
    code: "HDB",
    shortName: "HDBank",
    fullName: "Ngân hàng TMCP Phát triển TP.HCM",
    logo: "https://img.vietqr.io/image/HDB-logo.png"
  },
  {
    code: "VIB",
    shortName: "VIB",
    fullName: "Ngân hàng TMCP Quốc Tế Việt Nam",
    logo: "https://img.vietqr.io/image/VIB-logo.png"
  },
  {
    code: "SEAB",
    shortName: "SeABank",
    fullName: "Ngân hàng TMCP Đông Nam Á",
    logo: "https://img.vietqr.io/image/SEAB-logo.png"
  },
  {
    code: "MSB",
    shortName: "MSB",
    fullName: "Ngân hàng TMCP Hàng Hải Việt Nam",
    logo: "https://img.vietqr.io/image/MSB-logo.png"
  },
  {
    code: "SHB",
    shortName: "SHB",
    fullName: "Ngân hàng TMCP Sài Gòn - Hà Nội",
    logo: "https://img.vietqr.io/image/SHB-logo.png"
  },
  {
    code: "OCB",
    shortName: "OCB",
    fullName: "Ngân hàng TMCP Phương Đông",
    logo: "https://img.vietqr.io/image/OCB-logo.png"
  },
  {
    code: "LPB",
    shortName: "LPBank",
    fullName: "Ngân hàng TMCP Lộc Phát Việt Nam",
    logo: "https://img.vietqr.io/image/LPB-logo.png"
  },
  {
    code: "EIB",
    shortName: "Eximbank",
    fullName: "Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam",
    logo: "https://img.vietqr.io/image/EIB-logo.png"
  }
];

export const getBankLogo = (bankNameOrCode: string): string => {
  if (!bankNameOrCode) return "https://img.vietqr.io/image/VCB-logo.png";
  const clean = bankNameOrCode.toLowerCase();
  const found = VIETNAM_BANKS.find(
    (b) =>
      clean.includes(b.code.toLowerCase()) ||
      clean.includes(b.shortName.toLowerCase()) ||
      clean.includes(b.fullName.toLowerCase())
  );
  return found ? found.logo : "https://img.vietqr.io/image/VCB-logo.png";
};
