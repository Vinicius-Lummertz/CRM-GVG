# 🔐 Módulo: Verificação Segura (Hashing e Limits)

## O Verificador Universal de Login (OTP)
- **Arquivo de motor principal:** `otp.js`
- **Tabela Base:** `otp_challenges`

Este endpoint (`POST /api/v2/otp/verify`) é o gatekeeper da validação de OTP e possui alta responsabilidade contra Brute-Forcing.

### Operação Base de Segurança Interna
1. **Puxada Cronológica:** Intercepta as informações do Body do Request, selecionando no Supabase o desafio (`pending`) com formatação Timestamp temporal Descendente mais recente (pegando o Hash principal em atividade). Limita-se a 1 para salvar queries.
2. **Death Clock (Expiração Constante):** Envia erro pesado (400) se o cruzamento do script JS para a tabela detectar distanciamento de +15 minutos do limite de criação `expires_at`.
3. **Hard-Limit Timeout:** Mata completamente a verificação se a coluna nativa `attempts` possuir `5` preenchimentos na tentativa.
4. **Resumo Hash Criptográfico:** Passa pelo mesmo construtor `crypto.createHash('sha256')` das rotas da raiz `/send`. Compara se as chaves encodadas se encontram exatas (Status = Verified). Caso o cruzamento entre as strings seja diferente, devolve atualizando as taxas de attempts incrementalmente (+1) para as tabelas nativas via UPSERT.
