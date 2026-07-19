import uuid

from django.db import models
from django.utils.text import slugify

from base.models import BaseModel

from apps.accounts.models import CustomUser
# Create your models here.

def get_deleted_user():
    from apps.accounts.models import CustomUser
    user, _ = CustomUser.objects.get_or_create(
        username='deleted_user',
        defaults={
            'email': 'deleted@deleted.com',
            'is_active': False,
        }
    )
    return user.pk


class Project(BaseModel):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=150, null=True, blank=True, unique=True)
    description = models.TextField(null=True, blank=True)
    owner = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, related_name='projects')
    contributors = models.ManyToManyField('accounts.CustomUser', related_name="cont_projects", blank=True)
    is_public = models.BooleanField(default=False)

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            random_suffix = uuid.uuid4().hex[:6]
            self.slug = f"{slugify(self.name)}-{random_suffix}"
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = 'Project'
        verbose_name_plural = 'Projects'


class Task(BaseModel):
    title = models.CharField(max_length=150)
    slug = models.SlugField(max_length=200, null=True, blank=True, unique=True)
    description = models.TextField(null=True, blank=True)
    project = models.ForeignKey(
        Project, 
        on_delete=models.CASCADE, 
        related_name='tasks'
        )
    to_user = models.ForeignKey(
        'accounts.CustomUser', 
        on_delete=models.SET_DEFAULT, 
        default=get_deleted_user, 
        related_name='assigned_tasks'
        )
    from_user = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_DEFAULT,
        default=get_deleted_user, 
        related_name='created_tasks'
        )

    def save(self, *args, **kwargs):
        if not self.slug:
            random_suffix = uuid.uuid4().hex[:6]
            self.slug = f"{slugify(self.title)}-{random_suffix}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.title} - {self.to_user}'

    class Meta:
        verbose_name = 'Task'
        verbose_name_plural = 'Tasks'


class TaskComment(BaseModel):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, related_name='task_comments')
    content = models.TextField()
    file = models.FileField(upload_to='task_comments/', null=True, blank=True)
    github_url = models.URLField(null=True, blank=True)

    def __str__(self):
        return f"{self.task} - {self.user}"
    
    class Meta:
        verbose_name = 'Task Comment'
        verbose_name_plural = 'Task Comments'
        ordering = ['created_at']

class Application(BaseModel):
    title = models.CharField(max_length=100)
    slug = models.SlugField(max_length=150, null=True, blank=True, unique=True)
    description = models.TextField()
    is_accepted = models.BooleanField(default=False)
    user = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.CASCADE,
        related_name='created_applications'        
        )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='applications'
    )

    def __str__(self):
        return self.title
    
    def save(self, *args, **kwargs):
        if not self.slug:
            random_suffix = uuid.uuid4().hex[:6]
            self.slug = f"{slugify(self.title)}-{random_suffix}"
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = 'Application'
        verbose_name_plural = 'Applications'


class Department(BaseModel):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=150, null=True, blank=True, unique=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='groups')
    user = models.ManyToManyField(
        'accounts.CustomUser',
        through='DepartmentMember',
        related_name='departments',
        blank=True
    )

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            random_suffix = uuid.uuid4().hex[:6]
            self.slug = f"{slugify(self.name)}-{random_suffix}"
        super().save(*args, **kwargs)
    
    class Meta:
        verbose_name = 'Department'
        verbose_name_plural = 'Deparments'


class DepartmentMember(BaseModel):
    ROLES = (
        # IT field
        ('back-end developer', 'Back-end Developer'),
        ('front-end developer', 'Front-end Developer'),
        ('mobile developer', 'Mobile Developer'),
        ('data analyst', 'Data Analyst'),
        ('web designer', 'Web Designer'),
        ('cybersecurity specialist', 'Cybersecurity Specialist'),
        ('fullstack developer', 'Fullstack Developer'),
        ('software engineer', 'Software Engineer'),

        # Sales
        ('sales director', 'Sales Director'),
        ('sales manager', 'Sales Manager'),
        ('sales development representative', 'Sales Development Representative'),
        ('business development representative', 'Business Development Representative'),
        ('account executive', 'Account Executive'),
        ('sales specialist', 'Sales Specialist'),
        ('account manager', 'Account Manager'),
        ('customer success manager', 'Customer Success Manager'),
        ('vp of sales', 'VP of Sales'),

        # Finance
        ('cfo', 'CFO (Chief Financial Officer)'),
        ('fp&a analyst', 'FP&A Analyst'),
        ('chief accountant', 'Chief Accountant'),
        ('billing specialist', 'Billing Specialist'),
        ('accounts receivable', 'Accounts Receivable'),

        # Marketing
        ('cmo', 'CMO (Chief Marketing Officer)'),
        ('product marketing manager', 'Product Marketing Manager'),
        ('seo specialist', 'SEO Specialist'),
        ('content manager', 'Content Manager'),
        ('copywriter', 'Copywriter'),
        ('smm specialist', 'SMM Specialist'),
        ('email marketing specialist', 'Email Marketing Specialist'),
        ('marketing analyst', 'Marketing Analyst'),
        ('brand/graphic designer', 'Brand/Graphic Designer')
    )
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='department_members')
    user = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, related_name='department_memberships')
    role = models.CharField(max_length=100, choices=ROLES)

    class Meta:
        unique_together = ('department', 'user')