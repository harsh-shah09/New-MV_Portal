
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

export const generateTwoFactorSecret = (accountName: string) => {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(accountName, 'MV Portal', secret);
    return { secret, otpauth };
};

export const generateQRCode = async (otpauth: string) => {
    return await QRCode.toDataURL(otpauth);
};

export const verifyTwoFactorToken = (token: string, secret: string) => {
    return authenticator.check(token, secret);
};
