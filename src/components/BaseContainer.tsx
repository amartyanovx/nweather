import BaseStyles from '@/styles/base.module.css';
import Header from './Header';

export default function BaseContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className={BaseStyles.container}>
      <Header />
      {children}
    </div>
  );
}
