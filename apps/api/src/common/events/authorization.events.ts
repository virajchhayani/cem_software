export class RoleAssignedEvent {
  constructor(
    public readonly userId: string,
    public readonly role: string,
  ) {}
}

export class RoleRevokedEvent {
  constructor(
    public readonly userId: string,
    public readonly role: string,
  ) {}
}

export class PermissionGrantedEvent {
  constructor(
    public readonly userId: string,
    public readonly permission: string,
  ) {}
}

export class PermissionRevokedEvent {
  constructor(
    public readonly userId: string,
    public readonly permission: string,
  ) {}
}
