import { CircleCheck, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';

export const displayToastError = (message: string) => {
  toast.error(<span className="text-sm text-white">{message}</span>, {
    className:
      'bg-background flex items-center border border-red-500/80 rounded-sm mt-2',
    closeButton: true,
    icon: () => <XCircle className="h-4 w-4 text-red-600" />,
    hideProgressBar: true,
    autoClose: 3000,
  });
};

export const displayToastSuccess = (title: React.ReactNode) => {
  toast.success(<span className="text-sm text-white">{title}</span>, {
    className:
      'font-arima bg-black flex items-center border border-green-700 rounded-sm mt-2',
    closeButton: false,
    icon: () => <CircleCheck className="h-4 w-4 text-green-700" />,
    hideProgressBar: true,
    autoClose: 3000,
  });
};
