from django.urls import reverse
from rest_framework.test import APITestCase

from .models import CustomUser, ManagerRequest


class ManagerRequestTests(APITestCase):
	def setUp(self):
		self.user = CustomUser.objects.create_user(
			username='user',
			email='user@example.com',
			password='test-password',
		)
		self.client.force_authenticate(user=self.user)

	def test_get_returns_empty_list_when_no_request_exists(self):
		response = self.client.get(reverse('manager-request'))

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data, [])

	def test_request_includes_status_and_created_at(self):
		manager_request = ManagerRequest.objects.create(
			user=self.user,
			reason='I need to manage projects.',
		)

		response = self.client.get(reverse('manager-request'))

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data[0]['id'], str(manager_request.id))
		self.assertEqual(response.data[0]['status'], 'pending')
		self.assertTrue(response.data[0]['created_at'])

# Create your tests here.
