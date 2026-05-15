import {
  Anchor,
  Button,
  Code,
  CopyButton,
  Group,
  PinInput,
  PasswordInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useState } from 'react';
import { isEmail, useForm } from '@mantine/form';
import { Check } from 'tabler-icons-react';
import { AthleticsEvent, AuthPage, DLMeet, Team } from './types';
import { PICKS_PER_EVT, SERVER_URL } from './const';
import { evtSort } from './util';

interface AuthModalProps {
  arePicksComplete: boolean;
  meet: DLMeet;
  myTeam: Team;
  entries: Record<string, any> | null;
  tiebreakerEvt: string | undefined;
  tiebreakerMark: string | undefined;
  picksText: string;
  onClose: () => void;
}

export function AuthModal({ arePicksComplete, meet, myTeam, entries, tiebreakerEvt, tiebreakerMark, picksText, onClose }: AuthModalProps) {
  const [authPage, setAuthPage] = useState<AuthPage>('addPicks');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetError, setResetError] = useState('');

  const registerForm = useForm({
    initialValues: {
      name: '',
      email: '',
      password: '',
      tiebreaker: '',
    },
    validate: {
      email: isEmail('Invalid email'),
    },
  });

  const goToReset = () => {
    setAuthPage('resetRequest');
    setResetError('');
    setIsSuccess(false);
  };

  const goToAuth = () => {
    setAuthPage('addPicks');
    setResetError('');
    setIsSuccess(false);
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.values.email || !isEmail(registerForm.values.email)) {
      registerForm.setErrors({ email: 'Valid email required' });
      return;
    }
    setIsLoading(true);
    setResetEmail(registerForm.values.email);
    await fetch(SERVER_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'resetRequest', email: registerForm.values.email }),
    });
    setIsLoading(false);
    setAuthPage('resetConfirm');
    setResetError('');
  };

  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const newPassword = registerForm.values.password;
    if (!resetCode || resetCode.length !== 6 || !newPassword) {
      setResetError('Please enter the 6-digit code and a new password');
      return;
    }
    setIsLoading(true);
    const { status, error } = await (
      await fetch(SERVER_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'resetConfirm', email: resetEmail, code: resetCode, password: newPassword }),
      })
    ).json();
    setIsLoading(false);
    if (status === 'success') {
      registerForm.setFieldValue('email', resetEmail);
      setResetError('');
      setResetCode('');
      setAuthPage('addPicks');
    } else {
      setResetError(error === 'rate_limited' ? 'Too many attempts, please wait a minute' : 'Invalid or expired code');
    }
  };

  if (authPage === 'resetRequest') {
    return (
      <Stack>
        <Text>Enter your email address and we'll send you a 6-digit reset code.</Text>
        <form onSubmit={handleResetRequest}>
          <TextInput withAsterisk label="Email" placeholder="usain@bolt.com" {...registerForm.getInputProps('email')} />
          <Group justify="right" mt="md">
            <Button variant="subtle" onClick={goToAuth}>Back</Button>
            <Button type="submit" loading={isLoading}>Send Reset Code</Button>
          </Group>
        </form>
      </Stack>
    );
  }

  if (authPage === 'resetConfirm') {
    return (
      <Stack>
        <Text>Enter the 6-digit code sent to <strong>{resetEmail}</strong> and your new password. <Text fs="italic" component="span">(check your spam folder if you don't see the email)</Text></Text>
        <form onSubmit={handleResetConfirm}>
          <Group justify="center">
            <PinInput length={6} type="number" size="md" gap="sm" value={resetCode} onChange={setResetCode} oneTimeCode />
          </Group>
          <PasswordInput withAsterisk label="New Password" placeholder="New password" mt="md" {...registerForm.getInputProps('password')} />
          {resetError && <Text c="red" size="sm" mt={4}>{resetError}</Text>}
          <Group justify="right" mt="md">
            <Button variant="subtle" onClick={goToAuth}>Back</Button>
            <Button type="submit" loading={isLoading}>Reset Password</Button>
          </Group>
        </form>
      </Stack>
    );
  }

  if (!arePicksComplete) {
    return (
      <>
        <Text mb={20}>Please complete your picks before submission. You still need to select for these events:</Text>
        <Text component="ul">
          {Object.keys(entries?.[meet] ?? {})
            .sort(evtSort)
            .filter((evt) => (myTeam[meet]?.[evt as AthleticsEvent]?.length ?? 0) < PICKS_PER_EVT)
            .map((evt) => (
              <Text key={evt} component="li">{evt}</Text>
            ))}
        </Text>
      </>
    );
  }

  return (
    <Stack>
      <Text fs="italic">
        If you want to use an existing account from a previous contest or are updating your picks, click "Submit / Update Picks" -- otherwise, click
        "Register"
      </Text>
      <SegmentedControl
        value={authPage}
        onChange={(v: AuthPage) => {
          setAuthPage(v);
          registerForm.setErrors({});
          setIsSuccess(false);
        }}
        data={[
          { label: 'Submit / Update Picks', value: 'addPicks' },
          { label: 'Register', value: 'register' },
        ]}
        mb={10}
      />
      <form
        onChange={() => {
          setIsSuccess(false);
          registerForm.setErrors({});
        }}
        onSubmit={registerForm.onSubmit(async (vals) => {
          setIsLoading(true);
          let { status } = await (
            await fetch(SERVER_URL, {
              method: 'POST',
              body: JSON.stringify({
                action: authPage,
                ...vals,
                ...(authPage === 'addPicks'
                  ? {
                      meet,
                      picksJson: {
                        ...myTeam[meet],
                        tiebreaker: registerForm.values.tiebreaker,
                      },
                    }
                  : {}),
              }),
            })
          ).json();
          if (authPage === 'register' && status === 'success') {
            ({ status } = await (
              await fetch(SERVER_URL, {
                method: 'POST',
                body: JSON.stringify({
                  action: 'addPicks',
                  ...vals,
                  ...{
                    meet,
                    picksJson: {
                      ...myTeam[meet],
                      tiebreaker: registerForm.values.tiebreaker,
                    },
                  },
                }),
              })
            ).json());
          }
          setIsLoading(false);
          if (status === 'success') setIsSuccess(true);
          else {
            setIsSuccess(false);
            let msg = `Error in ${authPage === 'register' ? 'registration' : 'login'}, try again?`;
            if (authPage === 'register') msg += ' If you already have an account, click "Submit / Update Picks" to log in';
            registerForm.setErrors({
              email: msg,
              password: msg,
            });
          }
        })}
      >
        <TextInput withAsterisk label="Email" placeholder="usain@bolt.com" {...registerForm.getInputProps('email')} />
        {authPage === 'register' && (
          <TextInput withAsterisk label="Name" placeholder="Usain (will be displayed on leaderboards)" {...registerForm.getInputProps('name')} />
        )}
        <PasswordInput withAsterisk label="Password" placeholder="Password" {...registerForm.getInputProps('password')} />
        {authPage === 'addPicks' && (
          <Anchor size="sm" mt={4} onClick={goToReset} style={{ cursor: 'pointer' }}>Forgot password?</Anchor>
        )}
        <TextInput
          withAsterisk
          label={`Tiebreaker: ${tiebreakerEvt} winning time?`}
          placeholder={`e.g. ${tiebreakerMark}`}
          {...registerForm.getInputProps('tiebreaker')}
        />
        <Group justify="right" mt="md">
          <Button leftSection={isSuccess ? <Check /> : undefined} type="submit" loading={isLoading}>
            {authPage === 'register'
              ? isSuccess
                ? 'Registered and submitted picks!'
                : 'Register'
              : isSuccess
              ? 'Updated Picks!'
              : 'Submit / Update Picks'}
          </Button>
        </Group>
      </form>

      <Code mt={20} block>
        {picksText}
      </Code>
      <CopyButton value={picksText}>
        {({ copied, copy }) => (
          <Button color={copied ? 'teal' : 'blue'} onClick={copy}>
            {copied ? 'Copied picks' : 'Copy picks to clipboard'}
          </Button>
        )}
      </CopyButton>
    </Stack>
  );
}
