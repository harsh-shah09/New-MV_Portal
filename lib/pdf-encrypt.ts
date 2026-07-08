import { encryptPDF as pureJsEncrypt } from "@pdfsmaller/pdf-encrypt"

/**
 * Encrypts a PDF buffer with AES-256.
 *
 * Uses @pdfsmaller/pdf-encrypt which is a pure JS implementation.
 * This works natively in Vercel/Node.js without requiring the qpdf binary.
 *
 * Permissions granted: printing (full), everything else restricted.
 *
 * @param inputBuffer  Raw PDF bytes to encrypt
 * @param password     Plain-text password (e.g. birthdate in DDMMYYYY format)
 * @returns            Encrypted PDF as a Buffer
 */
export async function encryptPDF(inputBuffer: Buffer, password: string): Promise<Buffer> {
  const encBytes = await pureJsEncrypt(inputBuffer, password, {
    ownerPassword: password, // usually same as user password for simple protection
    algorithm: "AES-256",
    allowPrinting: true,
    allowHighQualityPrint: true,
    allowModifying: false,
    allowCopying: false,
    allowAnnotating: false,
    allowFillingForms: false,
    allowExtraction: false,
    allowAssembly: false,
  })

  return Buffer.from(encBytes)
}
