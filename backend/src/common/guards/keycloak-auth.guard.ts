import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { promisify } from 'util';
import { ConfigService } from '@nestjs/config';

interface DecodedToken {
  sub: string;
  email: string;
  name: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [key: string]: {
      roles: string[];
    };
  };
  preferred_username?: string;
}

@Injectable()
export class KeycloakAuthGuard implements CanActivate {
  private jwksClient: jwksClient.JwksClient;
  private readonly keycloakRealm: string;
  private readonly keycloakUrl: string;
  private readonly clientId: string;

  constructor(private configService: ConfigService) {
    this.keycloakUrl = this.configService.get<string>('KEYCLOAK_URL', 'http://localhost:8080');
    this.keycloakRealm = this.configService.get<string>('KEYCLOAK_REALM', 'radio-staff');
    this.clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID', 'radio-staff-backend');

    this.jwksClient = jwksClient({
      jwksUri: `${this.keycloakUrl}/realms/${this.keycloakRealm}/protocol/openid-connect/certs`,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No valid authorization header found');
    }

    const token = authHeader.substring(7);

    try {
      const decoded = await this.verifyToken(token);

      // Attach user info to request
      request.user = {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        username: decoded.preferred_username || decoded.email,
        roles: this.extractRoles(decoded),
      };

      return true;
    } catch (error: any) {
      throw new UnauthorizedException(`Invalid token: ${error?.message || 'Unknown error'}`);
    }
  }

  private async verifyToken(token: string): Promise<DecodedToken> {
    // Decode token without verification first to get the kid
    const decodedToken = jwt.decode(token, { complete: true }) as any;

    if (!decodedToken || !decodedToken.header || !decodedToken.header.kid) {
      throw new Error('Invalid token structure');
    }

    // Get the signing key
    const getSigningKey = promisify(this.jwksClient.getSigningKey).bind(this.jwksClient);
    const key = await getSigningKey(decodedToken.header.kid);

    if (!key) {
      throw new Error('Unable to get signing key');
    }

    const signingKey = 'publicKey' in key ? key.publicKey : key.rsaPublicKey;

    // Verify the token
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        signingKey,
        {
          algorithms: ['RS256'],
          issuer: `${this.keycloakUrl}/realms/${this.keycloakRealm}`,
        },
        (err, decoded) => {
          if (err) {
            reject(err);
          } else {
            resolve(decoded as DecodedToken);
          }
        },
      );
    });
  }

  private extractRoles(decodedToken: DecodedToken): string[] {
    const roles: string[] = [];

    // Extract realm roles
    if (decodedToken.realm_access?.roles) {
      roles.push(...decodedToken.realm_access.roles);
    }

    // Extract client roles
    if (decodedToken.resource_access && decodedToken.resource_access[this.clientId]?.roles) {
      roles.push(...decodedToken.resource_access[this.clientId].roles);
    }

    // Filter out default Keycloak roles
    return roles.filter(role =>
      !['offline_access', 'uma_authorization', 'default-roles-radio-staff'].includes(role)
    );
  }
}