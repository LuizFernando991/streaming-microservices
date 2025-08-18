package rabbitmq

import (
	"encoding/json"
	"fmt"
	"log"

	"process-video-service/internal/models"

	"github.com/streadway/amqp"
)

type RabbitMQ struct {
	conn    *amqp.Connection
	channel *amqp.Channel
}

func New(url string) *RabbitMQ {
	conn, err := amqp.Dial(url)
	if err != nil {
		log.Fatal(err)
	}
	ch, _ := conn.Channel()

	return &RabbitMQ{conn: conn, channel: ch}
}

func (r *RabbitMQ) Close() {
	r.channel.Close()
	r.conn.Close()
}

func (r *RabbitMQ) Consume(queue string, handler func(event models.UploadEvent, ack func(), nack func(requeue bool))) {
	msgs, err := r.channel.Consume(
		queue,
		"",
		false,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Fatal("Erro consumindo fila:", err)
	}

	go func() {
		for d := range msgs {
			var event models.UploadEvent
			if err := json.Unmarshal(d.Body, &event); err != nil {
				log.Println("Erro ao decodificar evento:", err)
				_ = d.Nack(false, false)
				continue
			}

			ack := func() { _ = d.Ack(false) }
			nack := func(requeue bool) { _ = d.Nack(false, requeue) }

			go handler(event, ack, nack)
		}
	}()
}

func (r *RabbitMQ) Publish(queue string, event any) error {
	_, err := r.channel.QueueDeclare(
		queue,
		true,
		false,
		false,
		false,
		nil,
	)

	if err != nil {
		return fmt.Errorf("queue declare error: %w", err)
	}

	body, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("serialize error: %w", err)
	}

	return r.channel.Publish(
		"",
		queue,
		false,
		false,
		amqp.Publishing{
			ContentType: "application/json",
			Body:        body,
		},
	)
}
