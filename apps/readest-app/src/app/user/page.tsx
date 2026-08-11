import { redirect } from 'next/navigation';

export default function UserPage(): never {
  redirect('/library');
}
