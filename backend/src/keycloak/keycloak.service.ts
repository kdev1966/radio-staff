import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

interface KeycloakToken {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  refresh_token: string;
  token_type: string;
  session_state: string;
}

interface KeycloakUser {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
  emailVerified: boolean;
  attributes?: Record<string, string[]>;
}

@Injectable()
export class KeycloakService {
  private readonly keycloakUrl: string;
  private readonly keycloakRealm: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly adminUsername: string;
  private readonly adminPassword: string;
  private axiosInstance: AxiosInstance;
  private adminToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(private configService: ConfigService) {
    this.keycloakUrl = this.configService.get<string>('KEYCLOAK_URL', 'http://localhost:8080');
    this.keycloakRealm = this.configService.get<string>('KEYCLOAK_REALM', 'radio-staff');
    this.clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID', 'radio-staff-backend');
    this.clientSecret = this.configService.get<string>('KEYCLOAK_CLIENT_SECRET', '');
    this.adminUsername = this.configService.get<string>('KEYCLOAK_ADMIN_USERNAME', 'admin');
    this.adminPassword = this.configService.get<string>('KEYCLOAK_ADMIN_PASSWORD', 'admin');

    this.axiosInstance = axios.create({
      baseURL: `${this.keycloakUrl}`,
    });
  }

  /**
   * Validate a user token
   */
  async validateToken(token: string): Promise<any> {
    try {
      const response = await this.axiosInstance.post(
        `/realms/${this.keycloakRealm}/protocol/openid-connect/token/introspect`,
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          token,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      if (!response.data.active) {
        throw new HttpException('Token is not active', HttpStatus.UNAUTHORIZED);
      }

      return response.data;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to validate token: ${error.message}`,
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * Get admin access token for Keycloak Admin API
   */
  private async getAdminToken(): Promise<string> {
    // Check if token is still valid
    if (this.adminToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.adminToken;
    }

    try {
      const response = await this.axiosInstance.post(
        `/realms/master/protocol/openid-connect/token`,
        new URLSearchParams({
          client_id: 'admin-cli',
          username: this.adminUsername,
          password: this.adminPassword,
          grant_type: 'password',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const token: KeycloakToken = response.data;
      this.adminToken = token.access_token;
      // Set expiry 30 seconds before actual expiry to be safe
      this.tokenExpiry = new Date(Date.now() + (token.expires_in - 30) * 1000);

      return this.adminToken;
    } catch (error: any) {
      throw new HttpException(
        `Failed to get admin token: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a new user in Keycloak
   */
  async createUser(userData: {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    password?: string;
    enabled?: boolean;
    attributes?: Record<string, string[]>;
  }): Promise<void> {
    const adminToken = await this.getAdminToken();

    try {
      const user: any = {
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        enabled: userData.enabled ?? true,
        emailVerified: true,
        attributes: userData.attributes,
      };

      if (userData.password) {
        user.credentials = [
          {
            type: 'password',
            value: userData.password,
            temporary: false,
          },
        ];
      }

      await this.axiosInstance.post(
        `/admin/realms/${this.keycloakRealm}/users`,
        user,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error: any) {
      if (error.response?.status === 409) {
        throw new HttpException('User already exists', HttpStatus.CONFLICT);
      }
      throw new HttpException(
        `Failed to create user: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get user by ID from Keycloak
   */
  async getUserById(userId: string): Promise<KeycloakUser> {
    const adminToken = await this.getAdminToken();

    try {
      const response = await this.axiosInstance.get(
        `/admin/realms/${this.keycloakRealm}/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        },
      );

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        `Failed to get user: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update user in Keycloak
   */
  async updateUser(
    userId: string,
    userData: Partial<KeycloakUser>,
  ): Promise<void> {
    const adminToken = await this.getAdminToken();

    try {
      await this.axiosInstance.put(
        `/admin/realms/${this.keycloakRealm}/users/${userId}`,
        userData,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        `Failed to update user: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete user from Keycloak
   */
  async deleteUser(userId: string): Promise<void> {
    const adminToken = await this.getAdminToken();

    try {
      await this.axiosInstance.delete(
        `/admin/realms/${this.keycloakRealm}/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        },
      );
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        `Failed to delete user: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(userId: string, roleName: string): Promise<void> {
    const adminToken = await this.getAdminToken();

    try {
      // First, get the role
      const rolesResponse = await this.axiosInstance.get(
        `/admin/realms/${this.keycloakRealm}/roles`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        },
      );

      const role = rolesResponse.data.find((r: any) => r.name === roleName);
      if (!role) {
        throw new HttpException(`Role ${roleName} not found`, HttpStatus.NOT_FOUND);
      }

      // Then assign it to the user
      await this.axiosInstance.post(
        `/admin/realms/${this.keycloakRealm}/users/${userId}/role-mappings/realm`,
        [role],
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to assign role: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(userId: string, roleName: string): Promise<void> {
    const adminToken = await this.getAdminToken();

    try {
      // First, get the role
      const rolesResponse = await this.axiosInstance.get(
        `/admin/realms/${this.keycloakRealm}/roles`,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        },
      );

      const role = rolesResponse.data.find((r: any) => r.name === roleName);
      if (!role) {
        throw new HttpException(`Role ${roleName} not found`, HttpStatus.NOT_FOUND);
      }

      // Then remove it from the user
      await this.axiosInstance.delete(
        `/admin/realms/${this.keycloakRealm}/users/${userId}/role-mappings/realm`,
        {
          data: [role],
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to remove role: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}