from django.urls import reverse
from rest_framework.test import APITestCase

from apps.accounts.models import CustomUser
from apps.management.models import Project, Task


class OverviewAnalyticsTests(APITestCase):
	def test_new_user_has_zero_daily_completion_trend(self):
		user = CustomUser.objects.create_user(
			username='new-user',
			email='new-user@example.com',
			password='test-password',
		)
		self.client.force_authenticate(user=user)

		response = self.client.get(reverse('overview'))

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['tasks']['completed_this_week'], 0)
		self.assertEqual(response.data['tasks']['daily_completed'], [0] * 7)

	def test_daily_completion_trend_counts_owned_tasks(self):
		user = CustomUser.objects.create_user(
			username='manager',
			email='manager@example.com',
			password='test-password',
		)
		project = Project.objects.create(name='Project', owner=user)
		Task.objects.create(
			title='Completed task',
			project=project,
			from_user=user,
			to_user=user,
			status='done',
		)
		self.client.force_authenticate(user=user)

		response = self.client.get(reverse('overview'))

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['tasks']['completed_this_week'], 1)
		self.assertEqual(sum(response.data['tasks']['daily_completed']), 1)
