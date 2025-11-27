import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  UnauthorizedException,
  BadRequestException,
  Logger,
  Put,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { InitiateRegistrationDto } from './dto/initiate-registration.dto';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyForgotPasswordOtpDto } from './dto/verify-forgot-password-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from './public.decorator';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateBasicInfoDto } from './dto/update-basic-info.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { InitiateUpdateEmailDto } from './dto/initiate-update-email.dto';
import { InitiateUpdatePhoneDto } from './dto/initiate-update-phone.dto';
import { VerifyUpdateOtpDto } from './dto/verify-update-otp.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger('AuthController');

  constructor(private readonly authService: AuthService) {}

  @Post('register/initiate')
  @Public()
  /**
   * Khởi tạo quy trình đăng ký bằng việc tạo bản ghi tạm và phát OTP tới người dùng.
   * @param initiateDto Thông tin email/số điện thoại và metadata phục vụ đăng ký.
   * @returns Promise kết quả chứa registrationId và thời gian hết hạn OTP.
   */
  async initiateRegistration(@Body() initiateDto: InitiateRegistrationDto) {
    return this.authService.initiateRegistration(initiateDto);
  }

  @Post('register/verify')
  @Public()
  /**
   * Xác thực OTP người dùng nhập vào cho quy trình đăng ký đang mở.
   * @param verifyOtpDto Dữ liệu gồm registrationId và mã OTP.
   * @returns Promise trạng thái xác thực để cho phép hoàn tất đăng ký.
   */
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(
      verifyOtpDto.registrationId,
      verifyOtpDto.otp,
    );
  }

  @Post('register/complete')
  @Public()
  /**
   * Hoàn tất đăng ký sau khi OTP hợp lệ và tạo tài khoản chính thức.
   * @param completeDto Thông tin hồ sơ cơ bản và registrationId cần hoàn tất.
   * @returns Promise thông tin người dùng mới kèm token đăng nhập.
   */
  async completeRegistration(@Body() completeDto: CompleteRegistrationDto) {
    return this.authService.completeRegistration(completeDto);
  }

  @Post('login')
  @Public()
  /**
   * Xử lý đăng nhập truyền thống bằng email/phone và mật khẩu kèm thông tin thiết bị.
   * @param loginDto Thông tin đăng nhập gửi từ client.
   * @param request Request Express để lấy IP, user-agent và device name.
   * @returns Promise token truy cập + refresh token cho người dùng.
   */
  async login(@Body() loginDto: LoginDto, @Req() request: ExpressRequest) {
    this.logger.log(
      `Login request - Email/Phone: ${loginDto.email || loginDto.phoneNumber}, DeviceType: ${
        loginDto.deviceType
      }`,
    );

    if (!loginDto.email && !loginDto.phoneNumber) {
      this.logger.warn('Login failed - No email or phone number provided');
      throw new BadRequestException('Either email or phone number is required');
    }

    const deviceInfo = {
      deviceName: request.headers['x-device-name'],
      deviceType: loginDto.deviceType,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    };

    this.logger.debug('Device info:', deviceInfo);

    const identifier = loginDto.email || loginDto.phoneNumber;
    return this.authService.login(identifier, loginDto.password, deviceInfo);
  }

  @Post('refresh')
  @Public()
  /**
   * Đổi access token mới dựa trên refresh token và deviceId hợp lệ.
   * @param refreshTokenDto Refresh token và deviceId do client cung cấp.
   * @returns Promise access token mới để tiếp tục phiên làm việc.
   */
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    this.logger.log(
      `Token refresh request - DeviceId: ${refreshTokenDto.deviceId}`,
    );
    return this.authService.refreshAccessToken(
      refreshTokenDto.refreshToken,
      refreshTokenDto.deviceId,
    );
  }

  @Post('logout')
  /**
   * Thu hồi refresh token hiện tại để kết thúc phiên đăng nhập.
   * @param refreshToken Refresh token lấy từ header `refresh-token`.
   * @returns Promise xác nhận đã logout thành công.
   */
  async logout(@Headers('refresh-token') refreshToken: string) {
    this.logger.log('Logout request received');

    if (!refreshToken) {
      this.logger.warn('Logout failed - No refresh token provided');
      throw new UnauthorizedException('Refresh token is required');
    }
    return this.authService.logout(refreshToken);
  }

  @Post('forgot-password')
  @Public()
  /**
   * Khởi tạo quy trình quên mật khẩu bằng cách phát OTP reset tới người dùng.
   * @param forgotPasswordDto Thông tin email/số điện thoại cần reset mật khẩu.
   * @returns Promise chứa resetId và trạng thái gửi OTP.
   */
  async initiateForgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.initiateForgotPassword(forgotPasswordDto);
  }

  @Post('forgot-password/verify')
  @Public()
  /**
   * Xác minh OTP của quy trình quên mật khẩu trước khi cho đổi mật khẩu.
   * @param verifyDto Dữ liệu resetId và mã OTP tương ứng.
   * @returns Promise xác nhận OTP hợp lệ.
   */
  async verifyForgotPasswordOtp(@Body() verifyDto: VerifyForgotPasswordOtpDto) {
    return this.authService.verifyForgotPasswordOtp(
      verifyDto.resetId,
      verifyDto.otp,
    );
  }

  @Post('forgot-password/reset')
  @Public()
  /**
   * Đặt lại mật khẩu mới sau khi OTP reset hợp lệ.
   * @param resetDto resetId, OTP và mật khẩu mới mà người dùng chọn.
   * @returns Promise xác nhận thay đổi mật khẩu thành công.
   */
  async resetPassword(@Body() resetDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetDto.resetId,
      resetDto.newPassword,
    );
  }

  @Put('change-password')
  /**
   * Đổi mật khẩu khi người dùng đã đăng nhập và cung cấp mật khẩu cũ hợp lệ.
   * @param changePasswordDto DTO chứa mật khẩu hiện tại và mật khẩu mới.
   * @param request Request chứa userId lấy từ JWT.
   * @returns Promise xác nhận đã cập nhật mật khẩu.
   */
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() request: Request,
  ) {
    const userId = request['user'].sub;
    return this.authService.changePassword(
      userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  @Put('update-basic-info')
  /**
   * Cập nhật thông tin hồ sơ cơ bản như tên, ngày sinh, status message.
   * @param updateBasicInfoDto DTO đã được ValidationPipe transform/validate.
   * @param request Request chứa userId đang đăng nhập.
   * @returns Promise bản ghi user info sau khi cập nhật.
   */
  async updateBasicInfo(
    @Body(new ValidationPipe({ transform: true }))
    updateBasicInfoDto: UpdateBasicInfoDto,
    @Req() request: Request,
  ) {
    const userId = request['user'].sub;
    return this.authService.updateBasicInfo(userId, updateBasicInfoDto);
  }

  @Put('update-profile-picture')
  @UseInterceptors(FileInterceptor('file'))
  /**
   * Thay đổi ảnh đại diện bằng cách upload file mới lên storage.
   * @param file File ảnh do người dùng chọn.
   * @param request Request chứa userId cần cập nhật.
   * @returns Promise metadata ảnh đại diện mới.
   */
  async updateProfilePicture(
    @UploadedFile() file: Express.Multer.File,
    @Req() request: Request,
  ) {
    const userId = request['user'].sub;
    return this.authService.updateProfilePicture(userId, file);
  }

  @Put('update-cover-image')
  @UseInterceptors(FileInterceptor('file'))
  /**
   * Cập nhật ảnh bìa hồ sơ và lưu metadata file.
   * @param file File ảnh bìa được upload.
   * @param request Request chứa userId thực hiện thao tác.
   * @returns Promise thông tin ảnh bìa sau khi cập nhật.
   */
  async updateCoverImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() request: Request,
  ) {
    const userId = request['user'].sub;
    this.logger.log(
      `Update cover image request - UserId: ${userId}, FileSize: ${file?.size || 'N/A'}`,
    );
    return this.authService.updateCoverImage(userId, file);
  }

  @Post('update-email/initiate')
  /**
   * Khởi tạo quy trình đổi email bằng cách gửi OTP tới email mới.
   * @param updateEmailDto Email mới và OTP channel.
   * @param request Request chứa userId hiện tại.
   * @returns Promise thông tin updateId và thời hạn OTP.
   */
  async initiateUpdateEmail(
    @Body() updateEmailDto: InitiateUpdateEmailDto,
    @Req() request: Request,
  ) {
    const userId = request['user'].sub;
    this.logger.log(
      `Initiate email update request - UserId: ${userId}, NewEmail: ${updateEmailDto.newEmail}`,
    );
    return this.authService.initiateUpdateEmail(userId, updateEmailDto);
  }

  @Post('update-email/verify')
  /**
   * Xác thực OTP đổi email trước khi cập nhật vào tài khoản.
   * @param verifyDto DTO chứa updateId và mã OTP người dùng nhập.
   * @returns Promise trạng thái cập nhật email.
   */
  async verifyUpdateEmailOtp(@Body() verifyDto: VerifyUpdateOtpDto) {
    this.logger.log(
      `Verify email update OTP request - UpdateId: ${verifyDto.updateId}`,
    );
    return this.authService.verifyUpdateEmailOtp(
      verifyDto.updateId,
      verifyDto.otp,
    );
  }

  @Post('update-phone/initiate')
  /**
   * Khởi tạo quy trình đổi số điện thoại bằng OTP.
   * @param updatePhoneDto Số điện thoại mới và metadata liên quan.
   * @param request Request chứa userId cần thay đổi số.
   * @returns Promise thông tin updateId để xác minh OTP.
   */
  async initiateUpdatePhone(
    @Body() updatePhoneDto: InitiateUpdatePhoneDto,
    @Req() request: Request,
  ) {
    const userId = request['user'].sub;
    this.logger.log(
      `Initiate phone update request - UserId: ${userId}, NewPhone: ${updatePhoneDto.newPhoneNumber}`,
    );
    return this.authService.initiateUpdatePhone(userId, updatePhoneDto);
  }

  @Post('update-phone/verify')
  /**
   * Xác nhận OTP đổi số điện thoại để cập nhật vào tài khoản.
   * @param verifyDto DTO chứa updateId và OTP.
   * @returns Promise trạng thái cập nhật số điện thoại.
   */
  async verifyUpdatePhoneOtp(@Body() verifyDto: VerifyUpdateOtpDto) {
    this.logger.log(
      `Verify phone update OTP request - UpdateId: ${verifyDto.updateId}`,
    );
    return this.authService.verifyUpdatePhoneOtp(
      verifyDto.updateId,
      verifyDto.otp,
    );
  }
}
