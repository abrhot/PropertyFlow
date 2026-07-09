import { Button } from '@fieldtrack/ui';
import { USER_ROLES } from '@fieldtrack/constants';

export default function HomePage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>FieldTrack</h1>
      <p>Field Operations Management Platform — Admin Portal</p>
      <p>Configured roles: {USER_ROLES.join(', ')}</p>
      <Button>Get started</Button>
    </main>
  );
}
