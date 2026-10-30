const jar = new Map<string, string>();

export function resetTestCookies() {
  jar.clear();
}

export function setTestCookie(name: string, value: string) {
  jar.set(name, value);
}

export async function cookies() {
  return {
    get(name: string) {
      const value = jar.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set(name: string, value: string) {
      jar.set(name, value);
    },
  };
}
