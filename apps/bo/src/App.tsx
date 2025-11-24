import React, { useEffect, useState } from 'react';

interface User {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string;
  role?: string;
}

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/users');
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        const data = await response.json();
        setUsers(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>FeelNNote Admin Dashboard</h1>
      </header>

      <main>
        <h2 style={{ marginBottom: '20px' }}>User Management</h2>

        {loading && <p>Loading users...</p>}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}

        {!loading && !error && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>ID</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>Email</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>Created At</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>Last Sign In</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>{user.id}</td>
                    <td style={{ padding: '12px' }}>{user.email || '-'}</td>
                    <td style={{ padding: '12px' }}>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '12px' }}>
                      {user.last_sign_in_at 
                        ? new Date(user.last_sign_in_at).toLocaleString() 
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: '20px', color: '#666' }}>Total Users: {users.length}</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
