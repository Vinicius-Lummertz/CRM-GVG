import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Smartphone, Check } from 'lucide-react';
import { MOCK_VERIFICATION_CODE } from '../data/mockData';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const router = useRouter();

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length >= 10) {
      setStep('code');
      setError('');
    } else {
      setError('Por favor, insira um número válido');
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }

    // Check if code is complete
    if (newCode.every(digit => digit !== '') && newCode.join('') === MOCK_VERIFICATION_CODE) {
      setTimeout(() => {
        localStorage.setItem('authenticated', 'true');
        router.push('/crm');
      }, 500);
    } else if (newCode.every(digit => digit !== '')) {
      setError('Código inválido');
      setTimeout(() => {
        setCode(['', '', '', '', '', '']);
        setError('');
        document.getElementById('code-0')?.focus();
      }, 1000);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/logogvg.png" alt="GVG CRM" width={96} height={96} className="h-24 mx-auto mb-6 object-cover" />
          <p className="text-gray-600">
            {step === 'phone' ? 'Entre com seu número do WhatsApp' : 'Digite o código de verificação'}
          </p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-6">
            <div>
              <label htmlFor="phone" className="block mb-2 text-gray-700">
                Número de Telefone
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

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <button
              type="submit"
              className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 rounded-lg transition-colors"
            >
              Enviar Código
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-pink-600 mt-0.5" />
                <div className="text-sm">
                  <p className="text-pink-800 mb-1">Código enviado!</p>
                  <p className="text-pink-700">
                    Enviamos um código de verificação para <strong>{phone}</strong>
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block mb-3 text-gray-700 text-center">
                Código de Verificação
              </label>
              <div className="flex gap-2 justify-center">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    id={`code-${index}`}
                    type="text"
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

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            <button
              onClick={() => setStep('phone')}
              className="w-full text-pink-600 hover:text-pink-700 text-sm"
            >
              Alterar número
            </button>
          </div>
        )}
      </div>
    </div>
  );
}