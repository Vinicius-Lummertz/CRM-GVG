import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Check } from 'lucide-react';
import * as api from '../../services/api';

function normalizePhoneForApi(rawPhone: string) {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? `+${digits}` : `+55${digits}`;
}

export default function Login() {
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiMode, setApiMode] = useState<api.ApiMode>('real');
  const [sandboxOtpCode, setSandboxOtpCode] = useState('');
  const router = useRouter();

  useEffect(() => {
    const savedMode = localStorage.getItem('apiMode');
    if (savedMode === 'real' || savedMode === 'sandbox') {
      setApiMode(savedMode);
    }
  }, []);

  const toggleApiMode = () => {
    const nextMode = apiMode === 'real' ? 'sandbox' : 'real';
    setApiMode(nextMode);
    localStorage.setItem('apiMode', nextMode);
    setError('');
    setSandboxOtpCode('');
    setCode(['', '', '', '', '', '']);
    setStep('phone');
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedPhone = normalizePhoneForApi(phone);
    if (normalizedPhone.length < 13) {
      setError('Informe um numero de WhatsApp valido com DDD.');
      return;
    }

    setLoading(true);

    try {
      const data = await api.sendOtp(normalizedPhone, apiMode);
      setSandboxOtpCode(apiMode === 'sandbox' && data?.sandboxOtpCode ? data.sandboxOtpCode : '');
      setPhone(normalizedPhone);
      setStep('code');
      setCode(['', '', '', '', '', '']);
    } catch (error) {
      console.error('Erro ao enviar OTP:', error);
      setError(error instanceof Error ? error.message : 'Erro ao conectar com o servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (enteredCode: string) => {
    setLoading(true);
    setError('');

    try {
      const data = await api.verifyOtp(phone.trim(), enteredCode, apiMode);

      if (data?.token) {
        localStorage.setItem('token', data.token);
      }
      if (data?.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      if (data?.operator) {
        localStorage.setItem('operator', JSON.stringify(data.operator));
      }

      localStorage.setItem('authenticated', 'true');
      localStorage.setItem('userPhone', phone.trim());
      localStorage.setItem('apiMode', apiMode);
      router.push('/crm');
    } catch (error) {
      console.error('Erro ao verificar OTP:', error);
      setError(error instanceof Error ? error.message : 'Erro ao verificar o codigo. Tente novamente.');
      setTimeout(() => {
        setCode(['', '', '', '', '', '']);
        setError('');
        document.getElementById('code-0')?.focus();
      }, 1200);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      document.getElementById(`code-${index + 1}`)?.focus();
    }

    if (newCode.every((digit) => digit !== '')) {
      verifyCode(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      document.getElementById(`code-${index - 1}`)?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative">
      <button
        type="button"
        onClick={toggleApiMode}
        className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        aria-pressed={apiMode === 'sandbox'}
      >
        <span className={`h-2.5 w-2.5 rounded-full ${apiMode === 'sandbox' ? 'bg-amber-500' : 'bg-green-500'}`} />
        {apiMode === 'sandbox' ? 'Sandbox' : 'Real'}
      </button>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/logogvg.png" alt="GVG CRM" width={96} height={96} className="h-24 mx-auto mb-6 object-cover" />
          <p className="text-gray-600">
            {step === 'phone' ? 'Entre com seu numero do WhatsApp' : 'Digite o codigo de verificacao'}
          </p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-6">
            <div>
              <label htmlFor="phone" className="block mb-2 text-gray-700">
                Numero de Telefone
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+55 11 98765-4321"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none transition-all"
              />
            </div>

            {error && <div className="text-red-500 text-sm">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pink-500 hover:bg-pink-600 disabled:cursor-not-allowed disabled:bg-pink-300 text-white py-3 rounded-lg transition-colors"
            >
              {loading ? 'Enviando...' : 'Enviar Codigo'}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-pink-600 mt-0.5" />
                <div className="text-sm">
                  <p className="text-pink-800 mb-1">Codigo enviado!</p>
                  <p className="text-pink-700">
                    Enviamos um codigo de verificacao para <strong>{phone}</strong>
                  </p>
                  {sandboxOtpCode && (
                    <p className="mt-2 text-pink-800">
                      Codigo sandbox: <strong>{sandboxOtpCode}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block mb-3 text-gray-700 text-center">
                Codigo de Verificacao
              </label>
              <div className="flex gap-2 justify-center">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    id={`code-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-xl border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none transition-all"
                    autoFocus={index === 0}
                  />
                ))}
              </div>
            </div>

            {error && <div className="text-red-500 text-sm text-center">{error}</div>}

            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setCode(['', '', '', '', '', '']);
                setError('');
              }}
              className="w-full text-pink-600 hover:text-pink-700 text-sm"
            >
              Alterar numero
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
