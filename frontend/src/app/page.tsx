"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [sandbox, setSandbox] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedDdd, setSelectedDdd] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleDddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
    if (v.length > 3) v = v.slice(0, 3);
    setSelectedDdd(v);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 9) v = v.slice(0, 9);
    
    if (v.length > 5) {
      v = v.replace(/^(\d{5})(\d{1,4})/, '$1-$2');
    }
    setPhoneNumber(v);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (!selectedDdd || selectedDdd.length < 2) {
        setError('Por favor, insira um DDD válido.');
        return;
    }
    if (!cleanPhone || cleanPhone.length < 8) {
        setError('Por favor, insira um número válido.');
        return;
    }
    setLoading(true);
    setError('');

    const fullPhone = `55${selectedDdd}${cleanPhone}`;
    const endpoint = '/api/auth/otp/send';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone: fullPhone, sandbox })
      });
      const data = await res.json();

      if (data.success) {
        setStep(2);
        if (sandbox && data.sandboxOtpCode) {
            console.log("Sandbox OTP is:", data.sandboxOtpCode);
        }
      } else {
        setError(data.error || 'Erro ao enviar OTP');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro de conexão com o servidor';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
        setError('Por favor, insira o código de 6 dígitos.');
        return;
    }
    setLoading(true);
    setError('');

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const fullPhone = `55${selectedDdd}${cleanPhone}`;
    const endpoint = '/api/auth/otp/verify';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone: fullPhone, code: otp, sandbox })
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('auth_phone', fullPhone);
        router.push('/leads');
      } else {
        setError(data.error || 'Código inválido');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro de conexão com o servidor';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-screen relative">
      
      {/* Sandbox Switch */}
      <div className="absolute top-6 right-6 z-10">
        <div className="switch-container">
          <label className="switch-label">Sandbox</label>
          <input 
            type="checkbox" 
            id="sandbox-mode" 
            className="switch-input" 
            checked={sandbox}
            onChange={(e) => setSandbox(e.target.checked)}
          />
          <label htmlFor="sandbox-mode" className="switch-slider"></label>
        </div>
      </div>

      <div className="card animate-fade-in w-full max-w-md p-10">
        
        <div className="flex justify-between items-center mb-8">
            <div>
                <h2 className="text-3xl mb-1 text-accent font-bold">CRM Login</h2>
                <p className="text-secondary text-sm">Acesse usando seu WhatsApp</p>
            </div>
        </div>

        {error && (
            <div className="bg-danger-light text-danger p-4 rounded-lg mb-6 text-sm border border-solid border-danger">
                {error}
            </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-5">
            <div>
                <label className="text-sm text-secondary mb-2 block">Número de WhatsApp</label>
                <div className="flex gap-2 items-stretch">
                  
                  <div className="input-addon">
                    <span className="mr-2 text-lg select-none">🇧🇷</span>
                    <span className="font-semibold text-base">+55</span>
                  </div>

                  <input 
                    type="text"
                    placeholder="DDD"
                    value={selectedDdd}
                    onChange={handleDddChange}
                    className="input-field text-center px-2 min-w-0"
                    style={{ width: '80px' }}
                    disabled={loading}
                  />

                  <input 
                    type="text" 
                    className="input-field flex-1 min-w-0" 
                    placeholder="99999-9999" 
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    disabled={loading}
                    autoFocus
                  />
                </div>
            </div>
            <button type="submit" className="btn-primary mt-2" disabled={loading || phoneNumber.length < 8 || selectedDdd.length < 2}>
              {loading ? <div className="spinner"></div> : 'Receber Código'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="animate-fade-in flex flex-col gap-5">
             <div className="text-center mb-2">
                <p className="text-sm text-secondary">Código enviado para o número</p>
                <p className="font-medium">+55 ({selectedDdd}) {phoneNumber}</p>
            </div>
            <div>
                <label className="text-sm text-secondary mb-2 block text-center">Digite os 6 dígitos</label>
                <input 
                  type="text" 
                  className="input-field text-center tracking-widest text-2xl font-semibold" 
                  placeholder="------" 
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  autoFocus
                />
            </div>
            <button type="submit" className="btn-primary mt-2" disabled={loading || otp.length < 6}>
              {loading ? <div className="spinner"></div> : 'Verificar Login'}
            </button>
            <button 
                type="button" 
                onClick={() => { setStep(1); setOtp(''); setError(''); }}
                className="btn-ghost mt-2"
                disabled={loading}
            >
                Voltar para alterar número
            </button>
          </form>
        )}
        
      </div>
    </div>
  );
}
