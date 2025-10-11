"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { getCurrentUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DebugAuthPage = () => {
  const { user, loading } = useAuth();
  const [authInfo, setAuthInfo] = useState<any>(null);
  const [backendResponse, setBackendResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testAuth = async () => {
      if (user) {
        try {
          const { getAuth } = await import('firebase/auth');
          const { app } = await import('@/lib/firebase');
          const currentUser = getAuth(app).currentUser;
          
          if (currentUser) {
            const idToken = await currentUser.getIdToken();
            setAuthInfo({
              uid: currentUser.uid,
              email: currentUser.email,
              hasToken: !!idToken,
              tokenLength: idToken ? idToken.length : 0
            });

            // Test backend API call
            try {
              const profileData = await getCurrentUser(true);
              setBackendResponse(profileData);
              setError(null);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Unknown error');
              setBackendResponse(null);
            }
          } else {
            setAuthInfo({ error: 'No current user' });
          }
        } catch (err) {
          setAuthInfo({ error: err instanceof Error ? err.message : 'Unknown error' });
        }
      }
    };

    testAuth();
  }, [user]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Please sign in to test authentication</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
      
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Firebase User Info</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                phoneNumber: user.phoneNumber
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Authentication Details</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(authInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Backend API Response</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="text-red-600">
                <strong>Error:</strong> {error}
              </div>
            ) : (
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(backendResponse, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={async () => {
                try {
                  const { getAuth } = await import('firebase/auth');
                  const { app } = await import('@/lib/firebase');
                  const currentUser = getAuth(app).currentUser;
                  if (currentUser) {
                    const idToken = await currentUser.getIdToken(true); // Force refresh
                    console.log('Refreshed token:', idToken);
                    alert('Token refreshed successfully');
                  }
                } catch (err) {
                  console.error('Error refreshing token:', err);
                  alert('Error refreshing token');
                }
              }}
              className="mr-2"
            >
              Refresh Firebase Token
            </Button>
            
            <Button 
              onClick={async () => {
                try {
                  const profileData = await getCurrentUser(true);
                  setBackendResponse(profileData);
                  setError(null);
                  alert('Backend API call successful');
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Unknown error');
                  setBackendResponse(null);
                  alert('Backend API call failed');
                }
              }}
            >
              Test Backend API
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DebugAuthPage;