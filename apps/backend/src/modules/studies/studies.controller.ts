import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StudiesService } from './studies.service';

@Controller('studies')
export class StudiesController {
  constructor(private readonly studiesService: StudiesService) {}

  @Get()
  getAllStudies() {
    return this.studiesService.findAll();
  }

  @Get('worklist')
  getWorklist() {
    return this.studiesService.getWorklist();
  }

  @Get(':id')
  getStudy(@Param('id') id: string) {
    return this.studiesService.findOne(id);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      dest: './uploads',
    }),
  )
  createStudy(@UploadedFile() file: any) {
    return this.studiesService.createStudy(file);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.studiesService.updateStatus(id, body.status);
  }

  @Post(':id/feedback')
  addFeedback(
    @Param('id') id: string,
    @Body() body: { decision: string; comment: string },
  ) {
    return this.studiesService.addFeedback(id, body.decision, body.comment);
  }
}

