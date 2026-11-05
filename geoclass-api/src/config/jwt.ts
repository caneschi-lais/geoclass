import dotenv from 'dotenv';
dotenv.config();

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '⚠️ AVISO DE SEGURANÇA: JWT_SECRET não está definido nas variáveis de ambiente! Configure JWT_SECRET no Render para máxima segurança.'
      );
    }
    return 'super_secret_jwt_key_geoclass_123';
  }
  return secret.trim();
}

