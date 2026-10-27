/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useContext,
  type ReactNode,
} from 'react';
import useIsBrowser from '@docusaurus/useIsBrowser';
import {createStorageSlot} from '../utils/storageUtils';
import {ReactContextError} from '../utils/reactUtils';
import {useThemeConfig, type ThemeConfig} from '../utils/useThemeConfig';

// Keep these keys in sync with the inlined script
// See packages/docusaurus-theme-classic/src/inlineScripts.ts
const AnnouncementBarDismissStorage = createStorageSlot(
  'docusaurus.announcement.dismiss',
);
const IdStorage = createStorageSlot('docusaurus.announcement.id');

// Retrocompatibility due to spelling mistake of default id
// see https://github.com/facebook/docusaurus/issues/3338
// cSpell:ignore annoucement
function isSameId(configuredId: string, storedId: string | null): boolean {
  return (
    storedId === configuredId ||
    (configuredId === 'announcement-bar' && storedId === 'annoucement-bar')
  );
}

const isDismissedInStorage = (
  announcementBar?: ThemeConfig['announcementBar'],
): boolean => {
  if (!announcementBar || announcementBar.isCloseable === false) {
    return false;
  }

  return (
    AnnouncementBarDismissStorage.get() === 'true' &&
    isSameId(announcementBar.id, IdStorage.get())
  );
};
const setDismissedInStorage = (bool: boolean) =>
  AnnouncementBarDismissStorage.set(String(bool));

type ContextValue = {
  /** Whether the announcement bar should be displayed. */
  readonly isActive: boolean;
  /**
   * Callback fired when the user closes the announcement. Will be saved.
   */
  readonly close: () => void;
};

const Context = React.createContext<ContextValue | null>(null);

function useContextValue(): ContextValue {
  const {announcementBar} = useThemeConfig();
  const isBrowser = useIsBrowser();

  const [isClosed, setClosed] = useState(() =>
    isBrowser
      ? // On client navigation: init with local storage value
        isDismissedInStorage(announcementBar)
      : // On server/hydration: always visible to prevent layout shifts (will be hidden with css if needed)
        false,
  );
  // Update state after hydration
  useEffect(() => {
    setClosed(isDismissedInStorage(announcementBar));
  }, [announcementBar]);

  const handleClose = useCallback(() => {
    setDismissedInStorage(true);
    setClosed(true);
  }, []);

  useEffect(() => {
    if (!announcementBar) {
      return;
    }
    const {id} = announcementBar;
    const storedId = IdStorage.get();
    const isNewAnnouncement = !isSameId(id, storedId);

    IdStorage.set(id);

    if (isNewAnnouncement) {
      setDismissedInStorage(false);
    }

    if (isNewAnnouncement || !isDismissedInStorage(announcementBar)) {
      setClosed(false);
    }
  }, [announcementBar]);

  return useMemo(
    () => ({
      isActive: !!announcementBar && !isClosed,
      close: handleClose,
    }),
    [announcementBar, isClosed, handleClose],
  );
}

export function AnnouncementBarProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const value = useContextValue();
  return <Context value={value}>{children}</Context>;
}

export function useAnnouncementBar(): ContextValue {
  const api = useContext(Context);
  if (!api) {
    throw new ReactContextError('AnnouncementBarProvider');
  }
  return api;
}
