import { redirect } from 'next/navigation';

export const instant = false;

export default function ReportsPage() {
  redirect('/customer/module/reports');
}
