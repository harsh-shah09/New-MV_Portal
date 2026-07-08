import { randomUUID } from "crypto"
import { writeFile, readFile, unlink } from "fs/promises"
import { join } from "path"
import { spawn } from "child_process"

/**
 * Encrypts a PDF buffer with AES-256 using the qpdf CLI (file-to-file mode).
 *
 * We invoke qpdf directly instead of using node-qpdf2's wrapper because:
 *  1. The wrapper's stdout pipe joins binary chunks as strings, corrupting the PDF.
 *  2. The wrapper rejects exit code 3 (warnings-only), which qpdf returns for
 *     valid PDFs that had recoverable issues during parse.
 *
 * Permissions granted: printing (full), everything else restricted.
 *
 * @param inputBuffer  Raw PDF bytes to encrypt
 * @param password     Plain-text password (e.g. birthdate in DDMMYYYY format)
 * @returns            Encrypted PDF as a Buffer
 */
export async function encryptPDF(inputBuffer: Buffer, password: string): Promise<Buffer> {
  const id = randomUUID()
  const tmpIn  = join("/tmp", `payslip-${id}-in.pdf`)
  const tmpOut = join("/tmp", `payslip-${id}-out.pdf`)

  try {
    await writeFile(tmpIn, inputBuffer)

    await new Promise<void>((resolve, reject) => {
      const args = [
        "--encrypt",
        password,  // user password
        password,  // owner password
        "256",     // AES-256
        "--print=full",
        "--modify=none",
        "--extract=n",
        "--annotate=n",
        "--assemble=n",
        "--accessibility=y",
        "--",
        tmpIn,
        tmpOut,
      ]

      const proc = spawn("qpdf", args)
      const stderr: Buffer[] = []

      proc.stderr.on("data", (chunk: Buffer) => stderr.push(chunk))

      proc.on("error", reject)

      proc.on("close", (code) => {
        // qpdf exit codes:
        //   0 = success
        //   3 = success with warnings (output file is still valid)
        //   other = error
        if (code === 0 || code === 3) {
          resolve()
        } else {
          reject(new Error(`qpdf exited with code ${code}: ${Buffer.concat(stderr).toString()}`))
        }
      })
    })

    return await readFile(tmpOut)
  } finally {
    await unlink(tmpIn).catch(() => undefined)
    await unlink(tmpOut).catch(() => undefined)
  }
}
